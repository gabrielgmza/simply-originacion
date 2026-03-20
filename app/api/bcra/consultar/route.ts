// app/api/bcra/consultar/route.ts
import { NextResponse } from "next/server";
import { consultarBcraConCache } from "@/lib/bcra/consultar-con-cache";

export async function POST(request: Request) {
  try {
    const { documento, sexo } = await request.json();

    if (!documento) {
      return NextResponse.json({ error: "Falta documento" }, { status: 400 });
    }

    const result = await consultarBcraConCache(documento, sexo || "M");

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: true,
        mensaje: result.error || "Error al consultar BCRA",
      });
    }

    return NextResponse.json({
      success: true,
      bcra: result.bcra,
      fromCache: result.fromCache,
      cachedAt: result.cachedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: true, mensaje: error.message }, { status: 500 });
  }
}
