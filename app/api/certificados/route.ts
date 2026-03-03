import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, collection, query,
  where, getDocs, orderBy, addDoc, serverTimestamp
} from "firebase/firestore";
import { registrarEvento } from "@/lib/auditoria/logger";

// ── Tipos de certificado ──────────────────────────────────────────────────────
// LIBRE_DEUDA      → crédito cancelado
// ESTADO_VIGENTE   → crédito activo con saldo
// CUOTAS_AL_DIA    → constancia de que está al día

type TipoCert = "LIBRE_DEUDA" | "ESTADO_VIGENTE" | "CUOTAS_AL_DIA";

// ── Helpers de color ──────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

// ── Plan de cuotas (mismo algoritmo que frontend) ─────────────────────────────
function generarPlan(op: any, pagos: any[]) {
  const { valorCuota, cuotas } = op.financiero || {};
  if (!valorCuota || !cuotas) return [];
  const fechaLiq = op.fechaLiquidacion?.toDate?.() || new Date();
  const totalPagado = pagos
    .filter((p: any) => p.tipo !== "DEVOLUCION")
    .reduce((a: number, p: any) => a + p.monto, 0);
  let saldo = totalPagado;
  const hoy = new Date();
  return Array.from({ length: cuotas }, (_, i) => {
    const venc = new Date(fechaLiq);
    venc.setMonth(venc.getMonth() + i + 1);
    let estado = "PENDIENTE";
    if (saldo >= valorCuota) { estado = "PAGADA"; saldo -= valorCuota; }
    else if (venc < hoy) estado = "VENCIDA";
    return { numero: i + 1, vencimiento: venc.toLocaleDateString("es-AR"), monto: valorCuota, estado };
  });
}

// ── RUTA POST ─────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { operacionId, entidadId, tipo, emisorNombre, emisorCargo, usuarioEmail }
      = await request.json() as {
          operacionId: string; entidadId: string; tipo: TipoCert;
          emisorNombre?: string; emisorCargo?: string; usuarioEmail?: string;
        };

    if (!operacionId || !entidadId || !tipo) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const [opSnap, entSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionId)),
      getDoc(doc(db, "entidades", entidadId)),
    ]);
    if (!opSnap.exists()) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

    const op  = { id: opSnap.id,  ...opSnap.data()  } as any;
    const ent = { id: entSnap.id, ...entSnap.data() } as any;

    const pagosSnap = await getDocs(
      query(collection(db, "pagos"),
        where("operacionId", "==", operacionId),
        orderBy("fecha", "asc"))
    );
    const pagos = pagosSnap.docs.map(d => d.data() as any);

    const plan         = generarPlan(op, pagos);
    const valorCuota   = op.financiero?.valorCuota   || 0;
    const totalCuotas  = op.financiero?.cuotas        || 0;
    const totalContrato= valorCuota * totalCuotas;
    const totalPagado  = pagos
      .filter((p: any) => p.tipo !== "DEVOLUCION")
      .reduce((a: number, p: any) => a + p.monto, 0);
    const saldoPendiente = Math.max(0, totalContrato - totalPagado);
    const cuotasPagadas  = plan.filter(c => c.estado === "PAGADA").length;
    const cuotasVencidas = plan.filter(c => c.estado === "VENCIDA").length;
    const alDia = cuotasVencidas === 0;

    const colorHex = ent.configuracion?.colorPrimario || "#FF5E14";
    const colorPrimario = hexToRgb(colorHex);
    const fechaEmision  = new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
    const nroLegajo     = operacionId.slice(0, 8).toUpperCase();

    // ── PDF ──────────────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const W = 595.28, H = 841.89; // A4
    const page = pdfDoc.addPage([W, H]);

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const gris     = rgb(0.4, 0.4, 0.4);
    const negro    = rgb(0.05, 0.05, 0.05);
    const blanco   = rgb(1, 1, 1);
    const verde    = rgb(0.1, 0.65, 0.3);
    const rojo     = rgb(0.85, 0.15, 0.15);
    const grisClaro= rgb(0.96, 0.96, 0.96);

    let y = H - 40;

    // ── BANDA SUPERIOR ────────────────────────────────────────────────────────
    page.drawRectangle({ x: 0, y: H - 80, width: W, height: 80, color: colorPrimario });

    // Nombre entidad
    page.drawText(ent.nombreFantasia || ent.razonSocial, {
      x: 40, y: H - 35, size: 18, font: fontBold, color: blanco,
    });
    page.drawText(`CUIT: ${ent.cuit || "—"}`, {
      x: 40, y: H - 56, size: 9, font: fontReg, color: rgb(1, 1, 1, 0.75),
    });
    // Número de certificado (derecha)
    page.drawText(`N° ${nroLegajo}`, {
      x: W - 120, y: H - 40, size: 10, font: fontBold, color: blanco,
    });
    page.drawText(fechaEmision, {
      x: W - 160, y: H - 56, size: 8, font: fontReg, color: rgb(1, 1, 1, 0.75),
    });

    y = H - 110;

    // ── TÍTULO CERTIFICADO ───────────────────────────────────────────────────
    const titulos: Record<TipoCert, string> = {
      LIBRE_DEUDA:    "CERTIFICADO DE CANCELACIÓN TOTAL DE DEUDA",
      ESTADO_VIGENTE: "CERTIFICADO DE ESTADO DE CRÉDITO VIGENTE",
      CUOTAS_AL_DIA:  "CONSTANCIA DE CUOTAS AL DÍA",
    };
    const titulo = titulos[tipo];

    // Línea decorativa
    page.drawRectangle({ x: 40, y: y - 4, width: 6, height: 28, color: colorPrimario });
    page.drawText(titulo, { x: 54, y, size: 13, font: fontBold, color: negro });
    y -= 30;

    // Subtítulo legal
    const subtitulos: Record<TipoCert, string> = {
      LIBRE_DEUDA:    "Por medio del presente, se certifica que el crédito ha sido cancelado en su totalidad.",
      ESTADO_VIGENTE: "Por medio del presente, se informa el estado actual del crédito identificado a continuación.",
      CUOTAS_AL_DIA:  "Por medio del presente, se certifica que el titular se encuentra al día con sus obligaciones.",
    };
    page.drawText(subtitulos[tipo], { x: 40, y, size: 9, font: fontReg, color: gris });
    y -= 28;

    // ── DATOS DEL TITULAR ────────────────────────────────────────────────────
    page.drawRectangle({ x: 40, y: y - 52, width: W - 80, height: 60, color: grisClaro, borderRadius: 4 });
    page.drawText("TITULAR DEL CRÉDITO", { x: 52, y: y - 10, size: 7, font: fontBold, color: gris });
    page.drawText(op.cliente?.nombre || "—", { x: 52, y: y - 26, size: 13, font: fontBold, color: negro });
    page.drawText(`DNI: ${op.cliente?.dni || "—"}   CUIL: ${op.cliente?.cuil || "—"}`, {
      x: 52, y: y - 42, size: 9, font: fontReg, color: gris,
    });
    // Legajo a la derecha
    page.drawText("LEGAJO", { x: W - 130, y: y - 10, size: 7, font: fontBold, color: gris });
    page.drawText(nroLegajo, { x: W - 130, y: y - 26, size: 13, font: fontBold, color: colorPrimario });

    y -= 72;

    // ── DATOS FINANCIEROS ────────────────────────────────────────────────────
    page.drawText("RESUMEN FINANCIERO", { x: 40, y, size: 8, font: fontBold, color: gris });
    y -= 14;

    const filas = [
      ["Monto otorgado",   fmt(op.financiero?.montoSolicitado || 0), "Total cuotas",     `${totalCuotas}`],
      ["Valor de cuota",   fmt(valorCuota),                          "TNA",              `${op.financiero?.tna || 0}%`],
      ["Total contrato",   fmt(totalContrato),                       "Total pagado",     fmt(totalPagado)],
      ["Saldo pendiente",  fmt(saldoPendiente),                      "Cuotas pagadas",   `${cuotasPagadas}/${totalCuotas}`],
    ];

    for (let i = 0; i < filas.length; i++) {
      const bg = i % 2 === 0 ? grisClaro : blanco;
      page.drawRectangle({ x: 40, y: y - 14, width: W - 80, height: 18, color: bg });
      const [l1, v1, l2, v2] = filas[i];
      page.drawText(l1, { x: 52, y: y - 10, size: 8, font: fontReg,  color: gris  });
      page.drawText(v1, { x: 180, y: y - 10, size: 9, font: fontBold, color: negro });
      page.drawText(l2, { x: 310, y: y - 10, size: 8, font: fontReg,  color: gris  });
      page.drawText(v2, { x: 430, y: y - 10, size: 9, font: fontBold, color: negro });
      y -= 18;
    }
    y -= 14;

    // ── SELLO DE ESTADO ──────────────────────────────────────────────────────
    if (tipo === "LIBRE_DEUDA") {
      page.drawRectangle({ x: 40, y: y - 32, width: W - 80, height: 40, color: rgb(0.9, 1, 0.92), borderRadius: 4 });
      page.drawText("✓  CRÉDITO CANCELADO EN SU TOTALIDAD", {
        x: 60, y: y - 16, size: 13, font: fontBold, color: verde,
      });
      page.drawText("El titular no registra deuda pendiente con esta entidad por el presente crédito.", {
        x: 60, y: y - 30, size: 8, font: fontReg, color: verde,
      });
    } else if (tipo === "CUOTAS_AL_DIA") {
      const color = alDia ? rgb(0.9, 1, 0.92) : rgb(1, 0.92, 0.92);
      const texto = alDia
        ? "✓  EL TITULAR SE ENCUENTRA AL DÍA CON SUS CUOTAS"
        : `✗  EL TITULAR REGISTRA ${cuotasVencidas} CUOTA${cuotasVencidas > 1 ? "S" : ""} VENCIDA${cuotasVencidas > 1 ? "S" : ""}`;
      page.drawRectangle({ x: 40, y: y - 32, width: W - 80, height: 40, color, borderRadius: 4 });
      page.drawText(texto, { x: 60, y: y - 16, size: 12, font: fontBold, color: alDia ? verde : rojo });
    } else {
      // ESTADO_VIGENTE: mostrar saldo
      page.drawRectangle({ x: 40, y: y - 32, width: W - 80, height: 40, color: grisClaro, borderRadius: 4 });
      page.drawText("SALDO PENDIENTE AL DÍA DE EMISIÓN:", { x: 60, y: y - 12, size: 9, font: fontBold, color: gris });
      page.drawText(fmt(saldoPendiente), { x: 60, y: y - 28, size: 16, font: fontBold, color: colorPrimario });
    }
    y -= 52;

    // ── PLAN RESUMIDO (últimas cuotas pendientes, máx 5) ────────────────────
    const pendientes = plan.filter(c => c.estado !== "PAGADA").slice(0, 5);
    if (pendientes.length > 0 && tipo !== "LIBRE_DEUDA") {
      page.drawText("PRÓXIMAS CUOTAS", { x: 40, y, size: 8, font: fontBold, color: gris });
      y -= 14;
      for (const c of pendientes) {
        const bg = c.estado === "VENCIDA" ? rgb(1, 0.95, 0.95) : grisClaro;
        const colorEstado = c.estado === "VENCIDA" ? rojo : gris;
        page.drawRectangle({ x: 40, y: y - 14, width: W - 80, height: 18, color: bg });
        page.drawText(`Cuota ${c.numero}`, { x: 52, y: y - 10, size: 8, font: fontBold, color: negro });
        page.drawText(c.vencimiento,      { x: 150, y: y - 10, size: 8, font: fontReg,  color: gris   });
        page.drawText(fmt(c.monto),       { x: 280, y: y - 10, size: 8, font: fontBold, color: negro  });
        page.drawText(c.estado,           { x: 400, y: y - 10, size: 8, font: fontBold, color: colorEstado });
        y -= 18;
      }
      y -= 10;
    }

    // ── FIRMA Y SELLO ────────────────────────────────────────────────────────
    y = Math.min(y, 180); // asegurar espacio
    page.drawLine({ start: { x: 40,       y: 120 }, end: { x: 240,     y: 120 }, thickness: 0.5, color: gris });
    page.drawLine({ start: { x: W - 240,  y: 120 }, end: { x: W - 40,  y: 120 }, thickness: 0.5, color: gris });

    page.drawText(emisorNombre || ent.nombreFantasia, {
      x: 40, y: 107, size: 9, font: fontBold, color: negro,
    });
    page.drawText(emisorCargo  || "Responsable de Créditos", {
      x: 40, y: 95, size: 8, font: fontReg, color: gris,
    });
    page.drawText(`${ent.nombreFantasia} — CUIT ${ent.cuit || "—"}`, {
      x: 40, y: 83, size: 8, font: fontReg, color: gris,
    });

    // Sello derecho (texto centrado)
    const sellaX = W - 240;
    page.drawText("SELLO DE LA ENTIDAD", { x: sellaX + 20, y: 107, size: 9, font: fontBold, color: colorPrimario });
    page.drawText(ent.razonSocial || ent.nombreFantasia, { x: sellaX + 20, y: 95,  size: 8, font: fontReg,  color: gris });

    // ── PIE ──────────────────────────────────────────────────────────────────
    page.drawLine({ start: { x: 40, y: 70 }, end: { x: W - 40, y: 70 }, thickness: 0.4, color: rgb(0.85, 0.85, 0.85) });
    page.drawText(
      `Documento emitido digitalmente por Simply Originación · ${fechaEmision} · Legajo ${nroLegajo}`,
      { x: 40, y: 58, size: 7, font: fontReg, color: rgb(0.65, 0.65, 0.65) }
    );
    page.drawText(
      "Este documento es válido sin firma manuscrita. Verificable mediante el N° de legajo.",
      { x: 40, y: 46, size: 7, font: fontReg, color: rgb(0.7, 0.7, 0.7) }
    );

    const pdfBytes = await pdfDoc.save();

    // ── Auditoría ─────────────────────────────────────────────────────────────
    await addDoc(collection(db, "auditoria"), {
      operacionId,
      entidadId,
      accion:       "CERTIFICADO_EMITIDO",
      detalles:     `Tipo: ${tipo} | Emisor: ${emisorNombre || "—"} | Legajo: ${nroLegajo}`,
      usuarioEmail: usuarioEmail || "sistema",
      fecha:        serverTimestamp(),
    });

    const nombreArchivo = `${tipo.toLowerCase().replace(/_/g, "-")}-${nroLegajo}.pdf`;

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      },
    });

  } catch (error: any) {
    console.error("[Certificados]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
