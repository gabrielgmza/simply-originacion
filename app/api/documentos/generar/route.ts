import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { PDFDocument, rgb } from "pdf-lib";

export async function POST(request: Request) {
  try {
    const { operacionId, entidadId } = await request.json();

    if (!operacionId || !entidadId) {
      return NextResponse.json({ error: "Faltan parametros" }, { status: 400 });
    }

    const opRef = doc(db, "operaciones", operacionId);
    const opSnap = await getDoc(opRef);
    if (!opSnap.exists()) throw new Error("Operacion no encontrada");
    const operacion = opSnap.data();

    const qPlantillas = query(
      collection(db, "plantillas"), 
      where("entidadId", "==", entidadId),
      where("mapeoConfigurado", "==", true)
    );
    const plantillasSnap = await getDocs(qPlantillas);
    
    let plantillaElegida = null;
    plantillasSnap.forEach((doc) => {
      const data = doc.data();
      if (data.tipoLinea === operacion.tipo || data.tipoLinea === "TODAS") {
        plantillaElegida = data;
      }
    });

    if (!plantillaElegida) {
      return NextResponse.json({ error: "No hay plantilla mapeada para esta linea de credito." }, { status: 404 });
    }

    const pdfResponse = await fetch(plantillaElegida.archivoUrl);
    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    let firmaImage = null;
    if (operacion.legajo?.firmaUrl) {
      const firmaResponse = await fetch(operacion.legajo.firmaUrl);
      const firmaBytes = await firmaResponse.arrayBuffer();
      firmaImage = await pdfDoc.embedPng(firmaBytes);
    }

    const coordenadas = plantillaElegida.coordenadas;
    const colorTexto = rgb(0.1, 0.1, 0.1);

    const calcX = (porcentaje: number) => (width * porcentaje) / 100;
    const calcY = (porcentaje: number) => height - ((height * porcentaje) / 100);

    if (coordenadas.aclaracion) {
      firstPage.drawText(operacion.cliente.nombre, {
        x: calcX(coordenadas.aclaracion.x),
        y: calcY(coordenadas.aclaracion.y),
        size: 11,
        color: colorTexto,
      });
    }

    if (coordenadas.dni) {
      firstPage.drawText(`DNI: ${operacion.cliente.dni}`, {
        x: calcX(coordenadas.dni.x),
        y: calcY(coordenadas.dni.y),
        size: 11,
        color: colorTexto,
      });
    }

    if (coordenadas.monto) {
      const montoFormateado = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(operacion.financiero.montoSolicitado);
      firstPage.drawText(montoFormateado, {
        x: calcX(coordenadas.monto.x),
        y: calcY(coordenadas.monto.y),
        size: 11,
        color: colorTexto,
      });
    }

    if (coordenadas.fecha) {
      const fechaActual = new Date().toLocaleDateString('es-AR');
      firstPage.drawText(fechaActual, {
        x: calcX(coordenadas.fecha.x),
        y: calcY(coordenadas.fecha.y),
        size: 11,
        color: colorTexto,
      });
    }

    if (coordenadas.firmaTitular && firmaImage) {
      const imgWidth = 120;
      const imgHeight = 60;
      firstPage.drawImage(firmaImage, {
        x: calcX(coordenadas.firmaTitular.x) - (imgWidth / 2),
        y: calcY(coordenadas.firmaTitular.y) - (imgHeight / 2),
        width: imgWidth,
        height: imgHeight,
      });
    }

    const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: true });
    
    const fileName = `contratos_finales/${entidadId}/${operacion.cliente.dni}_${Date.now()}.pdf`;
    const storageRef = ref(storage, fileName);
    await uploadString(storageRef, pdfBase64, "data_url");
    const contratoFinalUrl = await getDownloadURL(storageRef);

    await updateDoc(opRef, {
      "legajo.contratoFinalPdf": contratoFinalUrl,
      fechaActualizacion: serverTimestamp()
    });

    return NextResponse.json({ success: true, url: contratoFinalUrl }, { status: 200 });

  } catch (error: any) {
    console.error("Error al generar PDF:", error);
    return NextResponse.json({ error: "Error interno al compilar el documento legal" }, { status: 500 });
  }
}
