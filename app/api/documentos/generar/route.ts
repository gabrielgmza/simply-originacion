import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import crypto from "crypto";

const COLOR_NARANJA = rgb(1, 0.369, 0.078);
const COLOR_NEGRO = rgb(0, 0, 0);
const COLOR_GRIS = rgb(0.4, 0.4, 0.4);
const COLOR_GRIS_CLARO = rgb(0.9, 0.9, 0.9);

export async function POST(req: Request) {
  try {
    const { legajoId, dni, nombreCliente, cuil, monto, cuotas, cuotaEstimada, tna = 0, entidadNombre = "Entidad", entidadId } = await req.json();

    if (!legajoId || !dni || !monto) {
      return NextResponse.json({ error: "Faltan datos requeridos." }, { status: 400 });
    }

    // 1. Buscar firma y CBU del onboarding completado
    let firmaUrl = null;
    let cbu = "";
    try {
      const q = query(collection(db, "onboarding_tokens"), where("legajoId", "==", legajoId), where("estado", "==", "COMPLETADO"));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const o = snap.docs[0].data();
        firmaUrl = o.archivos?.firma || null;
        cbu = o.cbu || "";
      }
    } catch { }

    // 2. Crear PDF
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`CAD - ${nombreCliente} - ${dni}`);
    pdfDoc.setAuthor("Simply Originacion - PaySur");
    pdfDoc.setCreationDate(new Date());

    const page = pdfDoc.addPage([595.28, 841.89]);
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
    const nroDoc = `CAD-${Date.now().toString().slice(-8)}`;

    // Barra naranja
    page.drawRectangle({ x: 0, y: 800, width: 595.28, height: 42, color: COLOR_NARANJA });
    page.drawText("SIMPLY ORIGINACION", { x: 50, y: 817, size: 13, font: fontB, color: rgb(1, 1, 1) });
    page.drawText(`N deg ${nroDoc}`, { x: 400, y: 817, size: 10, font: fontR, color: rgb(1, 1, 1) });

    // Titulo
    page.drawText("CERTIFICADO DE AUTORIZACION DE DESCUENTO (CAD)", { x: 50, y: 770, size: 13, font: fontB, color: COLOR_NEGRO });
    page.drawText("Ley 24.452 — Modalidad: Descuento por Haberes (CUAD)", { x: 50, y: 752, size: 9, font: fontR, color: COLOR_GRIS });
    page.drawText(`Mendoza, ${fecha}`, { x: 400, y: 752, size: 9, font: fontR, color: COLOR_GRIS });
    page.drawLine({ start: { x: 50, y: 742 }, end: { x: 545, y: 742 }, thickness: 0.5, color: COLOR_GRIS_CLARO });

    // Datos del titular
    page.drawText("DATOS DEL TITULAR", { x: 50, y: 728, size: 9, font: fontB, color: COLOR_NARANJA });
    page.drawText("Apellido y Nombre", { x: 50, y: 712, size: 8, font: fontR, color: COLOR_GRIS });
    page.drawText(nombreCliente.toUpperCase(), { x: 50, y: 699, size: 11, font: fontB, color: COLOR_NEGRO });
    page.drawText("DNI", { x: 300, y: 712, size: 8, font: fontR, color: COLOR_GRIS });
    page.drawText(dni, { x: 300, y: 699, size: 11, font: fontB, color: COLOR_NEGRO });
    page.drawText("CUIL", { x: 430, y: 712, size: 8, font: fontR, color: COLOR_GRIS });
    page.drawText(cuil || `20-${dni}-9`, { x: 430, y: 699, size: 11, font: fontB, color: COLOR_NEGRO });
    page.drawLine({ start: { x: 50, y: 683 }, end: { x: 545, y: 683 }, thickness: 0.5, color: COLOR_GRIS_CLARO });

    // Condiciones del credito
    page.drawText("CONDICIONES DEL CREDITO", { x: 50, y: 670, size: 9, font: fontB, color: COLOR_NARANJA });
    page.drawText("Monto Otorgado", { x: 50, y: 654, size: 8, font: fontR, color: COLOR_GRIS });
    page.drawText(`$${monto.toLocaleString("es-AR")}`, { x: 50, y: 641, size: 11, font: fontB, color: COLOR_NEGRO });
    page.drawText("Cantidad de Cuotas", { x: 200, y: 654, size: 8, font: fontR, color: COLOR_GRIS });
    page.drawText(`${cuotas} cuotas`, { x: 200, y: 641, size: 11, font: fontB, color: COLOR_NEGRO });
    page.drawText("Valor de Cuota", { x: 330, y: 654, size: 8, font: fontR, color: COLOR_GRIS });
    page.drawText(`$${cuotaEstimada.toLocaleString("es-AR")}`, { x: 330, y: 641, size: 11, font: fontB, color: COLOR_NEGRO });
    page.drawText("TNA", { x: 460, y: 654, size: 8, font: fontR, color: COLOR_GRIS });
    page.drawText(`${tna}%`, { x: 460, y: 641, size: 11, font: fontB, color: COLOR_NEGRO });

    if (cbu) {
      page.drawText("CBU de Acreditacion", { x: 50, y: 622, size: 8, font: fontR, color: COLOR_GRIS });
      page.drawText(cbu, { x: 50, y: 609, size: 11, font: fontB, color: COLOR_NEGRO });
    }

    const yLineaSep = cbu ? 595 : 625;
    page.drawLine({ start: { x: 50, y: yLineaSep }, end: { x: 545, y: yLineaSep }, thickness: 0.5, color: COLOR_GRIS_CLARO });

    // Texto legal
    const yTexto = yLineaSep - 18;
    const lineasLegales = [
      `Por el presente instrumento, el/la titular identificado/a precedentemente AUTORIZA en forma irrevocable`,
      `al organismo pagador de sus haberes a practicar el descuento de las cuotas del credito otorgado`,
      `por ${entidadNombre}, conforme a la Ley N 24.452 y normativa CUAD del Gobierno de Mendoza.`,
      ``,
      `El titular declara conocer y aceptar las condiciones financieras. La presente autorizacion tendra`,
      `vigencia durante todo el plazo del credito y no podra ser revocada unilateralmente.`,
      ``,
      `La firma digital tiene plena validez legal conforme a la Ley N 25.506 de Firma Digital de Argentina.`,
    ];
    lineasLegales.forEach((txt, i) => {
      page.drawText(txt, { x: 50, y: yTexto - i * 14, size: 9, font: fontR, color: COLOR_NEGRO });
    });

    // Firma del cliente
    const yFirma = yTexto - lineasLegales.length * 14 - 30;
    page.drawLine({ start: { x: 50, y: yFirma + 60 }, end: { x: 545, y: yFirma + 60 }, thickness: 0.5, color: COLOR_GRIS_CLARO });
    page.drawText("FIRMA DIGITAL DEL TITULAR", { x: 50, y: yFirma + 46, size: 9, font: fontB, color: COLOR_NARANJA });

    if (firmaUrl) {
      try {
        const firmaRes = await fetch(firmaUrl);
        const firmaBuffer = await firmaRes.arrayBuffer();
        const firmaImg = await pdfDoc.embedPng(new Uint8Array(firmaBuffer));
        const dims = firmaImg.scaleToFit(180, 70);
        page.drawImage(firmaImg, { x: 50, y: yFirma - 30, width: dims.width, height: dims.height });
      } catch {
        page.drawRectangle({ x: 50, y: yFirma - 40, width: 180, height: 60, borderColor: COLOR_GRIS_CLARO, borderWidth: 1 });
        page.drawText("Firma no disponible", { x: 60, y: yFirma - 15, size: 8, font: fontR, color: COLOR_GRIS });
      }
    } else {
      page.drawRectangle({ x: 50, y: yFirma - 40, width: 180, height: 60, borderColor: COLOR_GRIS_CLARO, borderWidth: 1 });
      page.drawText("Pendiente de firma digital", { x: 55, y: yFirma - 15, size: 8, font: fontR, color: COLOR_GRIS });
    }

    page.drawLine({ start: { x: 50, y: yFirma - 48 }, end: { x: 230, y: yFirma - 48 }, thickness: 0.5, color: COLOR_NEGRO });
    page.drawText(nombreCliente.toUpperCase(), { x: 50, y: yFirma - 60, size: 8, font: fontB, color: COLOR_NEGRO });
    page.drawText(`DNI: ${dni}`, { x: 50, y: yFirma - 72, size: 8, font: fontR, color: COLOR_GRIS });

    // Pie de pagina con hash
    page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 58, color: rgb(0.97, 0.97, 0.97) });
    page.drawLine({ start: { x: 0, y: 58 }, end: { x: 595.28, y: 58 }, thickness: 0.5, color: COLOR_GRIS_CLARO });
    const hash = crypto.createHash("sha256").update(`${legajoId}|${dni}|${monto}|${cuotas}|${fecha}|${nroDoc}`).digest("hex");
    page.drawText("Documento generado digitalmente por Simply Originacion — PaySur Finanzas", { x: 50, y: 42, size: 7, font: fontR, color: COLOR_GRIS });
    page.drawText(`Hash SHA-256: ${hash.substring(0, 48)}...`, { x: 50, y: 28, size: 6, font: fontR, color: COLOR_GRIS });
    page.drawText(`N doc: ${nroDoc}  |  Generado: ${new Date().toISOString()}`, { x: 50, y: 16, size: 6, font: fontR, color: COLOR_GRIS });

    // 3. Serializar
    const pdfBytes = await pdfDoc.save();

    // 4. Subir a Storage y actualizar legajo
    let pdfUrl = "";
    try {
      const storageRef = ref(storage, `documentos/${entidadId}/${legajoId}/CAD_${nroDoc}.pdf`);
      await uploadBytes(storageRef, pdfBytes, { contentType: "application/pdf" });
      pdfUrl = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "operaciones", legajoId), {
        "documentos.cad_url": pdfUrl,
        "documentos.cad_hash": hash,
        "documentos.cad_nro": nroDoc,
        "documentos.cad_generado_en": serverTimestamp(),
      });
    } catch { }

    // 5. Devolver PDF
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="CAD_${dni}_${nroDoc}.pdf"`,
        "X-Doc-Hash": hash,
      },
    });

  } catch (error: any) {
    console.error("Error generando CAD:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
