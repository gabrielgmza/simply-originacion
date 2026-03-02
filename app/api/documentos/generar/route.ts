import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function POST(req: Request) {
    try {
        const { dni, monto, cuotas, cuotaEstimada } = await req.json();

        // Creamos un documento nuevo
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // Tamaño A4 estándar
        
        // Fuentes
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Título del Documento
        page.drawText('MUTUO DE PRÉSTAMO Y PAGARÉ', { 
            x: 130, y: 780, size: 20, font: fontBold, color: rgb(0, 0, 0) 
        });

        const fechaActual = new Date().toLocaleDateString('es-AR');

        // Cuerpo del contrato
        const textoCuerpo = 
            `En la ciudad de Mendoza, Argentina, a los ${fechaActual}, se acuerda el siguiente\n` +
            `préstamo de dinero sujeto a las siguientes condiciones:\n\n` +
            `1. DATOS DEL SOLICITANTE\n` +
            `   Documento de Identidad (DNI/CUIL): ${dni || 'NO ESPECIFICADO'}\n\n` +
            `2. ESTRUCTURA DEL CRÉDITO\n` +
            `   Monto Otorgado: $${monto.toLocaleString('es-AR')}\n` +
            `   Plan de Cuotas: ${cuotas} cuotas mensuales.\n` +
            `   Valor de Cuota Estimada: $${cuotaEstimada.toLocaleString('es-AR')}\n\n` +
            `3. CONDICIONES\n` +
            `   El solicitante se compromete a devolver el monto acordado más los intereses\n` +
            `   y gastos correspondientes en los plazos establecidos. En caso de mora,\n` +
            `   se aplicarán los punitorios vigentes por día de atraso.\n\n\n\n\n\n` +
            `   ______________________________                 ______________________________\n` +
            `        Firma del Solicitante                           Aclaración / DNI`;

        // Dibujamos el texto
        page.drawText(textoCuerpo, { 
            x: 50, y: 700, size: 12, font: fontRegular, lineHeight: 20, color: rgb(0.1, 0.1, 0.1) 
        });

        // Metadatos y firma de Simply
        page.drawText('Documento generado digitalmente por Simply Originación', {
            x: 50, y: 50, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5)
        });

        // Guardamos el PDF en memoria
        const pdfBytes = await pdfDoc.save();

        // Devolvemos el archivo listo para descargar
        return new NextResponse(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Contrato_${dni || 'Cliente'}.pdf"`
            }
        });

    } catch (error: any) {
        console.error("Error generando PDF:", error);
        return NextResponse.json({ success: false, error: true, mensaje: error.message }, { status: 500 });
    }
}
