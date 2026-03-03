// app/api/renovaciones/carta-precancelacion/route.ts
// Genera el PDF de carta de precancelación para el fondeador anterior
// Indica: datos del cliente, saldo a cancelar, CBU/instrucción de pago al nuevo fondeador

import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const COLOR_NEGRO    = rgb(0.05, 0.05, 0.05);
const COLOR_GRIS     = rgb(0.45, 0.45, 0.45);
const COLOR_PRIMARIO = rgb(1, 0.37, 0.08); // #FF5E14

function drawLine(page: PDFPage, y: number, x1 = 50, x2 = 545) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = COLOR_NEGRO) {
  page.drawText(text, { x, y, size, font, color });
}

function drawBloque(page: PDFPage, label: string, valor: string, x: number, y: number, fontR: PDFFont, fontB: PDFFont) {
  drawText(page, label, x, y + 12, fontR, 7.5, COLOR_GRIS);
  drawText(page, valor, x, y,      fontB, 10,  COLOR_NEGRO);
}

export async function POST(request: Request) {
  try {
    const { operacionOrigenId, nuevaOperacionId, entidadId } = await request.json();
    if (!operacionOrigenId || !entidadId)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    // Cargar datos
    const [opOrigenSnap, entSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionOrigenId)),
      getDoc(doc(db, "entidades",   entidadId)),
    ]);

    const opNuevaSnap = nuevaOperacionId
      ? await getDoc(doc(db, "operaciones", nuevaOperacionId))
      : null;

    if (!opOrigenSnap.exists()) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

    const op     = opOrigenSnap.data() as any;
    const opNueva = opNuevaSnap?.data() as any;
    const ent    = entSnap.data() as any;

    // Calcular saldo pendiente real
    const pagosSnap = await getDocs(
      query(collection(db, "pagos"), where("operacionId", "==", operacionOrigenId), where("estado", "==", "APROBADO"))
    );
    const cuotasPagadas    = pagosSnap.docs.length;
    const totalCuotas      = op.financiero?.cuotas     || 0;
    const valorCuota       = op.financiero?.valorCuota || 0;
    const cuotasPendientes = Math.max(0, totalCuotas - cuotasPagadas);
    const saldoPendiente   = Math.round(cuotasPendientes * valorCuota);

    const fmt = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

    // ── Crear PDF ──────────────────────────────────────────────────────────
    const pdfDoc  = await PDFDocument.create();
    const page    = pdfDoc.addPage([595.28, 841.89]); // A4
    const fontR   = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const W = 595.28;
    let y = 800;

    // ── Encabezado ─────────────────────────────────────────────────────────
    // Franja naranja
    page.drawRectangle({ x: 0, y: 820, width: W, height: 22, color: COLOR_PRIMARIO });
    drawText(page, (ent.nombreFantasia || "Paysur Finanzas").toUpperCase(), 50, 825, fontB, 9, rgb(1,1,1));
    drawText(page, fecha, W - 130, 825, fontR, 9, rgb(1,1,1));

    y = 775;
    drawText(page, "CARTA DE PRECANCELACIÓN", 50, y, fontB, 18, COLOR_NEGRO);
    y -= 16;
    drawText(page, "Instrucción de cancelación de saldo al fondeador anterior", 50, y, fontR, 9.5, COLOR_GRIS);
    y -= 10;
    drawLine(page, y);

    // ── DATOS DEL CLIENTE ──────────────────────────────────────────────────
    y -= 28;
    drawText(page, "DATOS DEL CLIENTE", 50, y, fontB, 8, COLOR_PRIMARIO);
    y -= 20;

    const cliente = op.cliente || {};
    drawBloque(page, "APELLIDO Y NOMBRE",     cliente.nombre       || "—",  50,  y, fontR, fontB);
    drawBloque(page, "DNI",                   cliente.dni          || "—",  220, y, fontR, fontB);
    drawBloque(page, "CUIL",                  cliente.cuil         || "—",  330, y, fontR, fontB);
    y -= 36;
    drawBloque(page, "CBU DEL CLIENTE",       cliente.cbu          || "—",  50,  y, fontR, fontB);
    drawBloque(page, "BANCO",                 cliente.banco        || "—",  280, y, fontR, fontB);
    y -= 16; drawLine(page, y);

    // ── CRÉDITO ANTERIOR ──────────────────────────────────────────────────
    y -= 28;
    drawText(page, "CRÉDITO A CANCELAR (FONDEADOR ANTERIOR)", 50, y, fontB, 8, COLOR_PRIMARIO);
    y -= 20;

    const fondeoAnterior = op.fondeo || {};
    drawBloque(page, "FONDEADOR",             fondeoAnterior.nombre    || "Capital Propio",  50,  y, fontR, fontB);
    drawBloque(page, "MONTO ORIGINAL",        `$${fmt(op.financiero?.montoSolicitado || 0)}`, 280, y, fontR, fontB);
    y -= 36;
    drawBloque(page, "CUOTAS TOTALES",        `${totalCuotas}`,         50,  y, fontR, fontB);
    drawBloque(page, "CUOTAS PAGADAS",        `${cuotasPagadas}`,       180, y, fontR, fontB);
    drawBloque(page, "CUOTAS PENDIENTES",     `${cuotasPendientes}`,    310, y, fontR, fontB);
    drawBloque(page, "VALOR CUOTA",           `$${fmt(valorCuota)}`,    430, y, fontR, fontB);

    // Saldo destacado
    y -= 50;
    page.drawRectangle({ x: 50, y: y - 8, width: W - 100, height: 46, color: rgb(0.97, 0.97, 0.97), borderColor: rgb(0.85,0.85,0.85), borderWidth: 0.5 });
    drawText(page, "SALDO A CANCELAR AL FONDEADOR ANTERIOR", 65, y + 26, fontB, 8, COLOR_GRIS);
    drawText(page, `$${fmt(saldoPendiente)}`, 65, y + 6, fontB, 20, COLOR_PRIMARIO);
    drawText(page, `(SON PESOS ${saldoPendiente.toLocaleString("es-AR")} CON 00/100)`, 220, y + 10, fontR, 8, COLOR_GRIS);

    y -= 20; drawLine(page, y);

    // ── INSTRUCCIÓN DE PAGO ───────────────────────────────────────────────
    y -= 28;
    drawText(page, "INSTRUCCIÓN DE PAGO AL NUEVO FONDEADOR", 50, y, fontB, 8, COLOR_PRIMARIO);
    y -= 16;

    const fondeoNuevo = opNueva?.fondeo || {};
    const instruccion =
      `Se instruye al nuevo fondeador (${fondeoNuevo.nombre || "a designar"}) a acreditar ` +
      `la suma de PESOS $${fmt(saldoPendiente)} en concepto de cancelación total del ` +
      `crédito identificado como Operación N° ${operacionOrigenId.slice(0,10).toUpperCase()}, ` +
      `correspondiente al cliente ${cliente.nombre || "—"} (DNI ${cliente.dni || "—"}), ` +
      `mediante transferencia bancaria al CBU indicado por ${fondeoAnterior.nombre || "el fondeador anterior"}.`;

    // Texto wrapping manual
    const palabras = instruccion.split(" ");
    let linea = "";
    const maxAncho = 70;
    for (const palabra of palabras) {
      if ((linea + " " + palabra).length > maxAncho) {
        drawText(page, linea.trim(), 50, y, fontR, 10, COLOR_NEGRO);
        y -= 16; linea = palabra;
      } else { linea += " " + palabra; }
    }
    if (linea.trim()) { drawText(page, linea.trim(), 50, y, fontR, 10, COLOR_NEGRO); y -= 16; }

    y -= 10; drawLine(page, y);

    // ── NUEVO CRÉDITO ─────────────────────────────────────────────────────
    if (opNueva) {
      y -= 28;
      drawText(page, "NUEVO CRÉDITO (REFERENCIA)", 50, y, fontB, 8, COLOR_PRIMARIO);
      y -= 20;
      drawBloque(page, "NUEVO FONDEADOR",    fondeoNuevo.nombre            || "—",                               50,  y, fontR, fontB);
      drawBloque(page, "MONTO NUEVO",        `$${fmt(opNueva.financiero?.montoSolicitado || 0)}`,                280, y, fontR, fontB);
      y -= 36;
      drawBloque(page, "CUOTAS",             `${opNueva.financiero?.cuotas || "—"}`,                            50,  y, fontR, fontB);
      drawBloque(page, "VALOR CUOTA",        `$${fmt(opNueva.financiero?.valorCuota || 0)}`,                    180, y, fontR, fontB);
      drawBloque(page, "TNA",                `${opNueva.financiero?.tna || 0}%`,                                310, y, fontR, fontB);
      y -= 16; drawLine(page, y);
    }

    // ── FIRMAS ─────────────────────────────────────────────────────────────
    y -= 50;
    const colFirma = (W - 100) / 3;
    for (let i = 0; i < 3; i++) {
      const xF = 50 + i * (colFirma + 8);
      drawLine(page, y, xF, xF + colFirma - 10);
      const labels = ["FIRMA DEL CLIENTE", `REPRESENTANTE\n${(ent.nombreFantasia || "ENTIDAD").toUpperCase()}`, "NUEVO FONDEADOR"];
      drawText(page, labels[i].split("\n")[0], xF, y - 14, fontR, 8, COLOR_GRIS);
      if (labels[i].includes("\n")) drawText(page, labels[i].split("\n")[1], xF, y - 24, fontR, 8, COLOR_GRIS);
    }

    // ── Pie ────────────────────────────────────────────────────────────────
    drawText(page, `Generado digitalmente por ${ent.nombreFantasia || "Paysur Finanzas"} · Op. ${operacionOrigenId.slice(0,10).toUpperCase()} · ${fecha}`, 50, 28, fontR, 7, COLOR_GRIS);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="CartaPrecancelacion_${cliente.dni || "cliente"}_${Date.now()}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("[Carta precancelación]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
