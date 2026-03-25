// app/api/legajo/pdf/route.ts
// Genera el legajo completo en PDF con hash de integridad y QR
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, collection, query, where,
  getDocs, orderBy, addDoc, serverTimestamp
} from "firebase/firestore";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createHash } from "crypto";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
const fmtFecha = (d: any) => {
  if (!d) return "—";
  const date = d?.toDate?.() || new Date(d);
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Generar hash SHA-256 del contenido del legajo
function generarHash(data: any): string {
  const str = JSON.stringify(data, null, 0);
  return createHash("sha256").update(str).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { operacionId, entidadId } = await request.json();
    if (!operacionId || !entidadId) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    // Cargar datos
    const [opSnap, entSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionId)),
      getDoc(doc(db, "entidades", entidadId)),
    ]);
    if (!opSnap.exists()) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

    const op  = { id: opSnap.id, ...opSnap.data() } as any;
    const ent = (entSnap.data() || {}) as any;

    // Pagos
    const pagosSnap = await getDocs(
      query(collection(db, "pagos"), where("operacionId", "==", operacionId), orderBy("fecha", "asc"))
    );
    const pagos = pagosSnap.docs.map(d => d.data());

    // Auditoría
    const auditSnap = await getDocs(
      query(collection(db, "auditoria"), where("operacionId", "==", operacionId), orderBy("fecha", "asc"))
    );
    const auditoria = auditSnap.docs.map(d => d.data());

    // Onboarding
    const obSnap = await getDocs(
      query(collection(db, "onboarding_tokens"), where("legajoId", "==", operacionId), where("estado", "==", "COMPLETADO"))
    );
    const onboarding = obSnap.empty ? null : obSnap.docs[0].data();

    // Vendedor
    let vendedorNombre = "—";
    if (op.vendedorId) {
      const vSnap = await getDoc(doc(db, "usuarios", op.vendedorId));
      if (vSnap.exists()) vendedorNombre = vSnap.data()?.nombre || op.vendedorId;
    }

    // ── HASH de integridad ──
    const hashData = {
      operacionId, entidadId,
      cliente: op.cliente,
      financiero: op.financiero,
      scoring: op.scoring,
      estado: op.estado,
      fechaLiquidacion: op.fechaLiquidacion?.toDate?.()?.toISOString(),
      aprobaciones: op.aprobaciones,
      fondeo: op.fondeo,
    };
    const hash = generarHash(hashData);
    const legajoId = `LEG-${operacionId.slice(0, 8).toUpperCase()}`;
    const qrUrl = `https://simply-originacion.vercel.app/verificar/${operacionId}?hash=${hash.slice(0, 16)}`;

    // ── GENERAR PDF ──
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 9;
    const lineHeight = 14;

    const colorPrimario = ent.configuracion?.colorPrimario || "#FF5E14";
    const r = parseInt(colorPrimario.slice(1, 3), 16) / 255;
    const g = parseInt(colorPrimario.slice(3, 5), 16) / 255;
    const b = parseInt(colorPrimario.slice(5, 7), 16) / 255;

    // Helper para agregar páginas
    let page = pdfDoc.addPage([595, 842]); // A4
    let y = 800;
    const marginLeft = 50;
    const pageWidth = 495;

    const addText = (text: string, x: number, options: any = {}) => {
      const f = options.bold ? fontBold : font;
      const s = options.size || fontSize;
      const c = options.color || rgb(1, 1, 1);
      if (y < 60) { page = pdfDoc.addPage([595, 842]); y = 800; }
      page.drawText(text, { x, y, font: f, size: s, color: c });
      if (!options.noAdvance) y -= (options.lineHeight || lineHeight);
    };

    const addLine = () => {
      page.drawLine({ start: { x: marginLeft, y }, end: { x: marginLeft + pageWidth, y }, thickness: 0.5, color: rgb(0.2, 0.2, 0.2) });
      y -= 10;
    };

    const addSection = (title: string) => {
      y -= 5;
      page.drawRectangle({ x: marginLeft, y: y - 2, width: pageWidth, height: 18, color: rgb(r, g, b) });
      addText(title, marginLeft + 8, { bold: true, size: 10, color: rgb(1, 1, 1) });
      y -= 5;
    };

    const addField = (label: string, value: string) => {
      addText(label + ":", marginLeft, { bold: true, color: rgb(0.6, 0.6, 0.6), noAdvance: true });
      addText(value || "—", marginLeft + 150, { color: rgb(0.9, 0.9, 0.9) });
    };

    // Fondo oscuro
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.03, 0.03, 0.03) });

    // ══════════════════════════════════════════════════════════════
    // CARÁTULA
    // ══════════════════════════════════════════════════════════════
    page.drawRectangle({ x: 0, y: 790, width: 595, height: 52, color: rgb(r, g, b) });
    addText(ent.nombreFantasia || "Simply Originación", marginLeft, { bold: true, size: 16, color: rgb(1, 1, 1) });
    addText("LEGAJO DIGITAL COMPLETO", marginLeft, { bold: true, size: 11, color: rgb(1, 1, 1) });
    y -= 10;

    addField("Legajo N°", legajoId);
    addField("Fecha de emisión", new Date().toLocaleDateString("es-AR"));
    addField("Estado", op.estado || "—");
    addField("Hash integridad", hash.slice(0, 32) + "...");
    y -= 5;

    // ══════════════════════════════════════════════════════════════
    // DATOS DEL CLIENTE
    // ══════════════════════════════════════════════════════════════
    addSection("DATOS DEL CLIENTE");
    addField("Nombre", op.cliente?.nombre);
    addField("DNI", op.cliente?.dni);
    addField("CUIL", op.cliente?.cuil);
    addField("Teléfono", op.cliente?.telefono);
    addField("Email", op.cliente?.email);
    addField("Domicilio", op.cliente?.domicilio);
    addField("CBU", op.cliente?.cbu);
    addField("Banco", op.cliente?.banco);

    // ══════════════════════════════════════════════════════════════
    // DETALLE FINANCIERO
    // ══════════════════════════════════════════════════════════════
    addSection("DETALLE FINANCIERO");
    addField("Producto", op.tipo || "—");
    addField("Monto solicitado", fmt(op.financiero?.montoSolicitado || 0));
    addField("Cuotas", `${op.financiero?.cuotas || 0}`);
    addField("Valor cuota", fmt(op.financiero?.valorCuota || 0));
    addField("TNA", `${op.financiero?.tna || 0}%`);
    addField("CFT", `${op.financiero?.cft || 0}%`);
    addField("Total a devolver", fmt((op.financiero?.valorCuota || 0) * (op.financiero?.cuotas || 0)));
    addField("Gastos otorgamiento", `${op.financiero?.gastosOtorgamiento || 0}%`);

    // ══════════════════════════════════════════════════════════════
    // FONDEADOR
    // ══════════════════════════════════════════════════════════════
    if (op.fondeo?.nombre) {
      addSection("FONDEADOR ASIGNADO");
      addField("Nombre", op.fondeo.nombre);
      addField("TNA fondeador", `${op.fondeo.tna || 0}%`);
      addField("Cuota final", fmt(op.fondeo.cuotaFinal || 0));
      addField("Comisión", fmt(op.fondeo.comision || 0));
      addField("Asignado por", op.fondeo.asignadoPor || "—");
    }

    // ══════════════════════════════════════════════════════════════
    // SCORING & BCRA
    // ══════════════════════════════════════════════════════════════
    addSection("SCORING CREDITICIO");
    addField("Puntaje scoring", `${op.scoring?.puntaje || 0}/1000`);
    addField("Decisión", op.scoring?.resultado || op.scoring?.decision || "—");
    addField("Situación BCRA", `${op.cliente?.scoreBcra || op.scoring?.bcra?.situacionActual || "—"}`);
    if (op.bcra?.tieneDeudas !== undefined) {
      addField("Tiene deudas BCRA", op.bcra.tieneDeudas ? "SÍ" : "NO");
      addField("Peor situación", `${op.bcra.peorSituacion || "—"}`);
    }

    // ══════════════════════════════════════════════════════════════
    // CUAD (si aplica)
    // ══════════════════════════════════════════════════════════════
    if (op.tipo === "CUAD" && op.cuad) {
      addSection("CUPO CUAD — GOBIERNO DE MENDOZA");
      addField("Cupo disponible", fmt(op.cuad.cupoDisponible || 0));
      addField("Código CAD", op.documentos?.cad_codigo || "—");
    }

    // ══════════════════════════════════════════════════════════════
    // JUICIOS
    // ══════════════════════════════════════════════════════════════
    if (op.judicial) {
      addSection("REGISTRO JUDICIAL");
      addField("Tiene registros", op.judicial.tieneRegistros ? "SÍ — ATENCIÓN" : "NO");
      if (op.judicial.registros?.length > 0) {
        for (const j of op.judicial.registros.slice(0, 3)) {
          addField("  Expediente", `${j.expediente} — ${j.tipo} — ${j.tribunal}`);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ONBOARDING & SEGURIDAD
    // ══════════════════════════════════════════════════════════════
    addSection("ONBOARDING DIGITAL & SEGURIDAD");
    addField("DNI frente", op.legajo?.dniFrenteUrl ? "✓ Capturado" : "✗ No disponible");
    addField("DNI dorso", op.legajo?.dniDorsoUrl ? "✓ Capturado" : "✗ No disponible");
    addField("Selfie", op.legajo?.selfieUrl ? "✓ Capturado" : "✗ No disponible");
    addField("Firma digital", op.legajo?.firmaUrl ? "✓ Firmado" : "✗ No disponible");
    addField("Liveness check", onboarding?.seguridad?.livenessAprobado ? "✓ Aprobado" : "—");

    // Geolocalización
    const geo = onboarding?.seguridad?.geolocacion || op.seguridad?.geolocacion;
    if (geo) {
      addField("Geolocalización", `Lat: ${geo.lat?.toFixed(6)} | Lng: ${geo.lng?.toFixed(6)}`);
    }

    // Device fingerprint
    const device = onboarding?.seguridad?.dispositivo || op.seguridad?.dispositivo;
    if (device) {
      addField("Dispositivo", device.userAgent?.slice(0, 80) || "—");
      if (device.ip) addField("IP", device.ip);
    }

    addField("Fecha onboarding", fmtFecha(onboarding?.seguridad?.fechaOnboarding || onboarding?.fechaCompletado));

    // ══════════════════════════════════════════════════════════════
    // HISTORIAL DE APROBACIONES
    // ══════════════════════════════════════════════════════════════
    if (op.aprobaciones?.length > 0) {
      addSection("HISTORIAL DE APROBACIONES");
      for (const a of op.aprobaciones) {
        addText(
          `${fmtFecha(a.fecha)} — ${a.nombre} (${a.rol}) — ${a.accion}${a.comentario ? ': ' + a.comentario.slice(0, 60) : ''}`,
          marginLeft, { size: 8, color: rgb(0.7, 0.7, 0.7) }
        );
      }
    }

    // ══════════════════════════════════════════════════════════════
    // COMPROBANTE DE LIQUIDACIÓN
    // ══════════════════════════════════════════════════════════════
    if (op.estado === "LIQUIDADO" || op.estado === "FINALIZADO" || op.estado === "EN_MORA") {
      addSection("LIQUIDACIÓN");
      addField("Fecha liquidación", fmtFecha(op.fechaLiquidacion));
      addField("Liquidado por", op.liquidacion?.liquidadoPor || vendedorNombre);
      addField("Nro transferencia", op.liquidacion?.nroTransferencia || "—");
      addField("Vendedor", vendedorNombre);
    }

    // ══════════════════════════════════════════════════════════════
    // AUDITORÍA
    // ══════════════════════════════════════════════════════════════
    if (auditoria.length > 0) {
      addSection("TRAIL DE AUDITORÍA");
      for (const a of auditoria.slice(0, 15)) {
        addText(
          `${fmtFecha(a.fecha)} | ${a.accion} | ${a.usuarioEmail || 'sistema'} | ${(a.detalles || '').slice(0, 60)}`,
          marginLeft, { size: 7, color: rgb(0.5, 0.5, 0.5) }
        );
      }
    }

    // ══════════════════════════════════════════════════════════════
    // PIE — QR + HASH
    // ══════════════════════════════════════════════════════════════
    y -= 10;
    addLine();
    addText(`Legajo ${legajoId} — ${ent.razonSocial || ent.nombreFantasia} — CUIT ${ent.cuit || "—"}`, marginLeft, { size: 7, color: rgb(0.4, 0.4, 0.4) });
    addText(`Hash SHA-256: ${hash}`, marginLeft, { size: 6, color: rgb(0.3, 0.3, 0.3) });
    addText(`Verificar: ${qrUrl}`, marginLeft, { size: 6, color: rgb(0.3, 0.3, 0.3) });
    addText(`Generado: ${new Date().toISOString()} — Este documento tiene validez legal como legajo digital.`, marginLeft, { size: 6, color: rgb(0.3, 0.3, 0.3) });

    // ── Serializar PDF ──
    const pdfBytes = await pdfDoc.save();

    // Registrar en auditoría
    await addDoc(collection(db, "auditoria"), {
      operacionId, entidadId,
      accion: "LEGAJO_PDF_GENERADO",
      detalles: `Hash: ${hash.slice(0, 16)}`,
      usuarioEmail: "sistema",
      fecha: serverTimestamp(),
    });

    // Guardar hash en la operación
    await import("firebase/firestore").then(({ updateDoc }) =>
      updateDoc(doc(db, "operaciones", operacionId), {
        "legajo.hashIntegridad": hash,
        "legajo.ultimaGeneracion": serverTimestamp(),
      })
    ).catch(() => {});

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="legajo-${legajoId}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("[Legajo PDF]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
