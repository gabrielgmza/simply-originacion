// app/api/legajo/masivo/route.ts
// Genera legajos PDF de múltiples operaciones y los devuelve como ZIP
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import JSZip from "jszip";

export async function POST(request: Request) {
  try {
    const { operacionIds, entidadId } = await request.json();
    if (!operacionIds?.length || !entidadId)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    // Limitar a 20 operaciones por lote
    const ids = operacionIds.slice(0, 20);

    // Generar cada PDF llamando a la API individual
    const baseUrl = request.url.split("/api/")[0];
    const zip = new JSZip();
    let exitosos = 0;

    for (const opId of ids) {
      try {
        const res = await fetch(`${baseUrl}/api/legajo/pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operacionId: opId, entidadId }),
        });

        if (res.ok) {
          const buffer = await res.arrayBuffer();
          zip.file(`legajo-${opId.slice(0, 8).toUpperCase()}.pdf`, buffer);
          exitosos++;
        }
      } catch (e) {
        console.error(`[Legajo masivo] Error op ${opId}:`, e);
      }
    }

    if (exitosos === 0) {
      return NextResponse.json({ error: "No se pudo generar ningún legajo" }, { status: 500 });
    }

    const zipBuffer = await zip.generateAsync({ type: "uint8array" });

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="legajos-${new Date().toISOString().slice(0, 10)}.zip"`,
      },
    });

  } catch (error: any) {
    console.error("[Legajo masivo]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
