import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { operacionId, clienteEmail, monto } = await request.json();
    
    // Aquí se conectaría con Twilio o SendGrid en el siguiente paso
    console.log(`Notificando liquidación de ${monto} para operación ${operacionId}`);

    return NextResponse.json({ 
      success: true, 
      mensaje: "Notificación enviada al cliente" 
    });
  } catch (error) {
    return NextResponse.json({ error: "Fallo envío de notificación" }, { status: 500 });
  }
}
