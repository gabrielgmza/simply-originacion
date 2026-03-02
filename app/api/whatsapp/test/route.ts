import { NextResponse } from "next/server";
import { enviarWhatsApp } from "@/lib/notificaciones/whatsapp";

// POST /api/whatsapp/test
export async function POST(request: Request) {
  try {
    const { entidadId, telefono } = await request.json();
    if (!entidadId || !telefono) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const result = await enviarWhatsApp({
      entidadId,
      telefono,
      evento: "CREDITO_APROBADO",
      datos: {
        nombreCliente: "Test",
        monto: 100000,
      },
      operacionId: undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
