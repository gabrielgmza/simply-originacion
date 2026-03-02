import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const PUNITORIO_DIARIO = 0.0012;

function generarPlanCuotas(op: any, pagos: any[]) {
  const { valorCuota, cuotas } = op.financiero || {};
  if (!valorCuota || !cuotas) return [];

  const fechaLiquidacion = op.fechaLiquidacion?.toDate?.() || new Date();
  const totalPagado = pagos
    .filter((p: any) => p.tipo !== "DEVOLUCION")
    .reduce((acc: number, p: any) => acc + p.monto, 0);

  let saldoDisponible = totalPagado;
  const hoy = new Date();

  return Array.from({ length: cuotas }, (_, i) => {
    const vencimiento = new Date(fechaLiquidacion);
    vencimiento.setMonth(vencimiento.getMonth() + i + 1);

    let estado = "PENDIENTE";
    if (saldoDisponible >= valorCuota) {
      estado = "PAGADA";
      saldoDisponible -= valorCuota;
    } else if (vencimiento < hoy) {
      estado = "VENCIDA";
    }

    return {
      numero: i + 1,
      vencimiento: vencimiento.toLocaleDateString("es-AR"),
      monto: valorCuota,
      estado,
    };
  });
}

export async function POST(request: Request) {
  try {
    const { operacionId, entidadId } = await request.json();

    // Cargar datos
    const [opSnap, entSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionId)),
      getDoc(doc(db, "entidades", entidadId)),
    ]);

    if (!opSnap.exists()) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

    const op = { id: opSnap.id, ...opSnap.data() };
    const ent = entSnap.data() || {};

    const pagosSnap = await getDocs(
      query(collection(db, "pagos"),
        where("operacionId", "==", operacionId),
        orderBy("fecha", "asc"))
    );
    const pagos = pagosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const plan = generarPlanCuotas(op, pagos);
    const valorCuota = (op as any).financiero?.valorCuota || 0;
    const totalCuotas = (op as any).financiero?.cuotas || 0;
    const totalContrato = valorCuota * totalCuotas;
    const totalPagado = pagos.filter((p: any) => p.tipo !== "DEVOLUCION").reduce((acc, p: any) => acc + p.monto, 0);
    const saldoPendiente = Math.max(0, totalContrato - totalPagado);
    const diasMora = (op as any).cobranzas?.diasMora || 0;
    const punitorio = Math.round(((op as any).financiero?.montoSolicitado || 0) * PUNITORIO_DIARIO * diasMora);
    const porcentaje = totalContrato > 0 ? Math.min(100, Math.round((totalPagado / totalContrato) * 100)) : 0;

    // Serializar datos para Python
    const datos = {
      entidad: {
        nombre: ent.nombreFantasia || ent.razonSocial || "Entidad",
        cuit: ent.cuit || "",
        color: ent.configuracion?.colorPrimario || "#FF5E14",
      },
      cliente: {
        nombre: (op as any).cliente?.nombre || "",
        dni: (op as any).cliente?.dni || "",
        cuil: (op as any).cliente?.cuil || "",
      },
      financiero: {
        montoSolicitado: (op as any).financiero?.montoSolicitado || 0,
        valorCuota,
        totalCuotas,
        tna: (op as any).financiero?.tna || 0,
        totalContrato,
        totalPagado,
        saldoPendiente,
        punitorio,
        porcentaje,
        diasMora,
      },
      fechaEmision: new Date().toLocaleDateString("es-AR"),
      operacionId: operacionId.slice(0, 8).toUpperCase(),
      plan,
      pagos: pagos.map((p: any) => ({
        monto: p.monto,
        tipo: p.tipo,
        fecha: p.fecha?.toDate?.()?.toLocaleDateString("es-AR") || "—",
        observacion: p.observacion || "",
      })),
    };

    const tmpJson = join(tmpdir(), `ec_${operacionId}.json`);
    const tmpPdf  = join(tmpdir(), `ec_${operacionId}.pdf`);
    writeFileSync(tmpJson, JSON.stringify(datos));

    const script = `
import json, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

with open('${tmpJson}', 'r') as f:
    d = json.load(f)

color_hex = d['entidad']['color'].lstrip('#')
r, g, b = tuple(int(color_hex[i:i+2], 16)/255 for i in (0, 2, 4))
color_primario = colors.Color(r, g, b)

doc = SimpleDocTemplate('${tmpPdf}', pagesize=A4,
    rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)

styles = getSampleStyleSheet()
estilo_titulo  = ParagraphStyle('Titulo',  fontSize=18, fontName='Helvetica-Bold', textColor=color_primario, spaceAfter=4)
estilo_sub     = ParagraphStyle('Sub',     fontSize=10, fontName='Helvetica',      textColor=colors.gray,    spaceAfter=2)
estilo_label   = ParagraphStyle('Label',   fontSize=8,  fontName='Helvetica-Bold', textColor=colors.gray,    spaceAfter=1)
estilo_normal  = ParagraphStyle('Normal',  fontSize=9,  fontName='Helvetica',      spaceAfter=2)
estilo_small   = ParagraphStyle('Small',   fontSize=7,  fontName='Helvetica',      textColor=colors.gray)
estilo_right   = ParagraphStyle('Right',   fontSize=9,  fontName='Helvetica',      alignment=TA_RIGHT)

story = []

# ── ENCABEZADO ──
story.append(Paragraph(d['entidad']['nombre'], estilo_titulo))
story.append(Paragraph(f"CUIT: {d['entidad']['cuit']}  ·  Estado de Cuenta emitido el {d['fechaEmision']}", estilo_sub))
story.append(HRFlowable(width='100%', thickness=2, color=color_primario, spaceAfter=12))

# ── DATOS DEL CLIENTE ──
story.append(Paragraph("TITULAR DEL CRÉDITO", estilo_label))
data_cliente = [
    ['Nombre', d['cliente']['nombre'], 'DNI', d['cliente']['dni']],
    ['CUIL', d['cliente']['cuil'], 'N° Legajo', d['operacionId']],
]
t = Table(data_cliente, colWidths=[3*cm, 7*cm, 3*cm, 4*cm])
t.setStyle(TableStyle([
    ('FONTNAME',  (0,0), (-1,-1), 'Helvetica'),
    ('FONTNAME',  (0,0), (0,-1), 'Helvetica-Bold'),
    ('FONTNAME',  (2,0), (2,-1), 'Helvetica-Bold'),
    ('FONTSIZE',  (0,0), (-1,-1), 9),
    ('TEXTCOLOR', (0,0), (0,-1), colors.gray),
    ('TEXTCOLOR', (2,0), (2,-1), colors.gray),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(t)
story.append(Spacer(1, 12))

# ── RESUMEN FINANCIERO ──
story.append(Paragraph("RESUMEN FINANCIERO", estilo_label))
fi = d['financiero']
fmt = lambda n: f"${n:,.0f}".replace(',', '.')
data_fin = [
    ['Monto otorgado', fmt(fi['montoSolicitado']), 'Cuotas', str(fi['totalCuotas'])],
    ['Valor de cuota', fmt(fi['valorCuota']),       'TNA', f"{fi['tna']}%"],
    ['Total contrato', fmt(fi['totalContrato']),    'Total pagado', fmt(fi['totalPagado'])],
    ['Saldo pendiente', fmt(fi['saldoPendiente']),  'Avance', f"{fi['porcentaje']}%"],
]
if fi['diasMora'] > 0:
    data_fin.append(['Dias en mora', str(fi['diasMora']), 'Punitorio acum.', fmt(fi['punitorio'])])

tf = Table(data_fin, colWidths=[4*cm, 6*cm, 3*cm, 4*cm])
tf.setStyle(TableStyle([
    ('FONTNAME',     (0,0), (-1,-1), 'Helvetica'),
    ('FONTNAME',     (0,0), (0,-1), 'Helvetica-Bold'),
    ('FONTNAME',     (2,0), (2,-1), 'Helvetica-Bold'),
    ('FONTSIZE',     (0,0), (-1,-1), 9),
    ('TEXTCOLOR',    (0,0), (0,-1), colors.gray),
    ('TEXTCOLOR',    (2,0), (2,-1), colors.gray),
    ('BACKGROUND',   (0,0), (-1,0), colors.Color(0.95,0.95,0.95)),
    ('ROWBACKGROUNDS',(0,0), (-1,-1), [colors.white, colors.Color(0.97,0.97,0.97)]),
    ('GRID',         (0,0), (-1,-1), 0.5, colors.Color(0.9,0.9,0.9)),
    ('BOTTOMPADDING',(0,0), (-1,-1), 5),
    ('TOPPADDING',   (0,0), (-1,-1), 5),
]))
story.append(tf)
story.append(Spacer(1, 16))

# ── PLAN DE CUOTAS ──
story.append(Paragraph("PLAN DE CUOTAS", estilo_label))
cabecera = [['N°', 'Vencimiento', 'Monto', 'Estado']]
filas_cuotas = cabecera + [
    [str(c['numero']), c['vencimiento'], fmt(c['monto']), c['estado']]
    for c in d['plan']
]
tc = Table(filas_cuotas, colWidths=[1.5*cm, 5*cm, 4*cm, 6.5*cm])
style_cuotas = [
    ('FONTNAME',  (0,0), (-1,0), 'Helvetica-Bold'),
    ('FONTSIZE',  (0,0), (-1,-1), 8),
    ('BACKGROUND',(0,0), (-1,0), color_primario),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('GRID',      (0,0), (-1,-1), 0.3, colors.Color(0.88,0.88,0.88)),
    ('BOTTOMPADDING',(0,0), (-1,-1), 4),
    ('TOPPADDING',   (0,0), (-1,-1), 4),
]
for i, c in enumerate(d['plan'], 1):
    if c['estado'] == 'PAGADA':
        style_cuotas.append(('TEXTCOLOR', (3,i), (3,i), colors.Color(0.1,0.7,0.3)))
        style_cuotas.append(('BACKGROUND',(0,i), (-1,i), colors.Color(0.94,1,0.95)))
    elif c['estado'] == 'VENCIDA':
        style_cuotas.append(('TEXTCOLOR', (3,i), (3,i), colors.red))
        style_cuotas.append(('BACKGROUND',(0,i), (-1,i), colors.Color(1,0.95,0.95)))
tc.setStyle(TableStyle(style_cuotas))
story.append(tc)
story.append(Spacer(1, 16))

# ── HISTORIAL DE PAGOS ──
if d['pagos']:
    story.append(Paragraph("PAGOS REGISTRADOS", estilo_label))
    cabecera_pagos = [['Fecha', 'Tipo', 'Monto', 'Observacion']]
    filas_pagos = cabecera_pagos + [
        [p['fecha'], p['tipo'], fmt(p['monto']), p['observacion'] or '-']
        for p in d['pagos']
    ]
    tp = Table(filas_pagos, colWidths=[3*cm, 3*cm, 4*cm, 7*cm])
    tp.setStyle(TableStyle([
        ('FONTNAME',  (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',  (0,0), (-1,-1), 8),
        ('BACKGROUND',(0,0), (-1,0), colors.Color(0.2,0.2,0.2)),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [colors.white, colors.Color(0.97,0.97,0.97)]),
        ('GRID',      (0,0), (-1,-1), 0.3, colors.Color(0.88,0.88,0.88)),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
    ]))
    story.append(tp)

# ── PIE ──
story.append(Spacer(1, 20))
story.append(HRFlowable(width='100%', thickness=0.5, color=colors.Color(0.8,0.8,0.8)))
story.append(Spacer(1, 6))
story.append(Paragraph(f"Documento generado automaticamente por el sistema Simply Originacion · {d['fechaEmision']}", estilo_small))

doc.build(story)
print("OK")
`;

    const scriptPath = join(tmpdir(), `ec_script_${operacionId}.py`);
    writeFileSync(scriptPath, script);

    execSync(`python3 ${scriptPath}`, { timeout: 15000 });

    const pdfBuffer = readFileSync(tmpPdf);

    // Limpiar temporales
    try { unlinkSync(tmpJson); unlinkSync(tmpPdf); unlinkSync(scriptPath); } catch {}

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="estado-cuenta-${operacionId.slice(0,6)}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("[Estado cuenta PDF]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
