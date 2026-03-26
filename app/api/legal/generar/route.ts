// app/api/legal/generar/route.ts
// Recibe plantillaId + operacionId, reemplaza variables, genera PDF
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { reemplazarVariables } from "@/lib/legal/variables";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function POST(request: Request) {
  try {
    const { plantillaId, operacionId, entidadId } = await request.json();
    if (!plantillaId || !operacionId || !entidadId)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    // Cargar datos
    const [opSnap, entSnap, plantillaSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionId)),
      getDoc(doc(db, "entidades", entidadId)),
      getDoc(doc(db, "plantillas_legales", plantillaId)),
    ]);

    if (!opSnap.exists()) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });
    if (!plantillaSnap.exists()) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });

    const op = { id: opSnap.id, ...opSnap.data() } as any;
    const ent = entSnap.data() as any;
    const plantilla = plantillaSnap.data() as any;

    // Obtener nombre del vendedor
    let vendedorNombre = "";
    if (op.vendedorId) {
      const vSnap = await getDoc(doc(db, "usuarios", op.vendedorId));
      if (vSnap.exists()) vendedorNombre = vSnap.data()?.nombre || "";
    }

    const datos = { operacion: op, entidad: ent, vendedor: vendedorNombre };

    // Si la plantilla tiene contenido de texto (editado en el sistema)
    if (plantilla.contenidoTexto) {
      const textoFinal = reemplazarVariables(plantilla.contenidoTexto, datos);
      const pdfBytes = await generarPdfDesdeTexto(textoFinal, plantilla.titulo, ent);

      await addDoc(collection(db, "auditoria"), {
        operacionId, entidadId,
        accion: "CONTRATO_GENERADO",
        detalles: `Plantilla: ${plantilla.titulo}`,
        usuarioEmail: "sistema",
        fecha: serverTimestamp(),
      });

      return new NextResponse(pdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${plantilla.titulo}-${op.id.slice(0, 8).toUpperCase()}.pdf"`,
        },
      });
    }

    // Si la plantilla tiene archivo DOCX subido
    if (plantilla.archivoUrl) {
      try {
        // Descargar el DOCX desde Storage
        const response = await fetch(plantilla.archivoUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Procesar DOCX: extraer texto, reemplazar variables
        const textoExtraido = await extraerTextoDocx(buffer);
        const textoFinal = reemplazarVariables(textoExtraido, datos);
        const pdfBytes = await generarPdfDesdeTexto(textoFinal, plantilla.titulo, ent);

        await addDoc(collection(db, "auditoria"), {
          operacionId, entidadId,
          accion: "CONTRATO_GENERADO",
          detalles: `Plantilla: ${plantilla.titulo} (DOCX)`,
          usuarioEmail: "sistema",
          fecha: serverTimestamp(),
        });

        return new NextResponse(pdfBytes, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${plantilla.titulo}-${op.id.slice(0, 8).toUpperCase()}.pdf"`,
          },
        });
      } catch (e: any) {
        return NextResponse.json({ error: "Error procesando DOCX: " + e.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Plantilla sin contenido" }, { status: 400 });

  } catch (error: any) {
    console.error("[Legal generar]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Extraer texto de DOCX ──
async function extraerTextoDocx(buffer: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("No se encontró word/document.xml");

  // Extraer texto de los tags XML
  const texto = documentXml
    .replace(/<w:p[^>]*\/>/g, "\n")           // párrafos vacíos
    .replace(/<w:p[^>]*>/g, "")               // inicio de párrafo
    .replace(/<\/w:p>/g, "\n")                // fin de párrafo = salto de línea
    .replace(/<w:tab\/>/g, "\t")              // tabulaciones
    .replace(/<w:br[^>]*\/>/g, "\n")          // line breaks
    .replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, "$1") // contenido de texto
    .replace(/<[^>]+>/g, "")                  // eliminar otros tags XML
    .replace(/\n{3,}/g, "\n\n")              // máximo 2 saltos seguidos
    .trim();

  return texto;
}

// ── Generar PDF desde texto plano ──
async function generarPdfDesdeTexto(texto: string, titulo: string, entidad: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 10;
  const lineHeight = 14;
  const marginLeft = 50;
  const marginRight = 50;
  const pageWidth = 595; // A4
  const pageHeight = 842;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const maxCharsPerLine = Math.floor(contentWidth / (fontSize * 0.5));

  const lineas = texto.split("\n");
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 60;

  // Header con título
  page.drawText(entidad?.nombreFantasia || "Simply", {
    x: marginLeft, y, font: fontBold, size: 12, color: rgb(0.4, 0.4, 0.4),
  });
  y -= 20;
  page.drawText(titulo.toUpperCase(), {
    x: marginLeft, y, font: fontBold, size: 14, color: rgb(0, 0, 0),
  });
  y -= 30;
  page.drawLine({ start: { x: marginLeft, y }, end: { x: pageWidth - marginRight, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 20;

  for (const linea of lineas) {
    if (linea.trim() === "") {
      y -= lineHeight * 0.5;
      if (y < 60) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - 60; }
      continue;
    }

    // Word wrap
    const palabras = linea.split(" ");
    let lineaActual = "";
    for (const palabra of palabras) {
      const test = lineaActual ? lineaActual + " " + palabra : palabra;
      if (test.length > maxCharsPerLine) {
        if (y < 60) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - 60; }
        page.drawText(lineaActual, { x: marginLeft, y, font, size: fontSize, color: rgb(0, 0, 0) });
        y -= lineHeight;
        lineaActual = palabra;
      } else {
        lineaActual = test;
      }
    }
    if (lineaActual) {
      if (y < 60) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - 60; }
      page.drawText(lineaActual, { x: marginLeft, y, font, size: fontSize, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }

  // Footer
  y -= 20;
  if (y < 100) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - 60; }
  page.drawLine({ start: { x: marginLeft, y }, end: { x: pageWidth - marginRight, y }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });
  y -= 15;
  page.drawText(`Documento generado por ${entidad?.nombreFantasia || "Simply"} — ${new Date().toLocaleDateString("es-AR")}`, {
    x: marginLeft, y, font, size: 7, color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}
