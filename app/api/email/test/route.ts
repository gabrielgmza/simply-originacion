// app/api/email/test/route.ts
// Envía un email de resumen de prueba para verificar configuración
import { NextResponse } from "next/server";
import { dispararEmail } from "@/lib/email/motor";

export async function POST(request: Request) {
  try {
    const { entidadId, to } = await request.json();
    if (!entidadId || !to)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    const result = await dispararEmail(entidadId, "RESUMEN_DIARIO", to, {
      fecha:             new Date().toLocaleDateString("es-AR"),
      operacionesNuevas: 0,
      liquidados:        0,
      montoLiquidado:    0,
      cobrosExitosos:    0,
      cobrosRechazados:  0,
      enMora:            0,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
