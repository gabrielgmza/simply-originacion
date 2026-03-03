// app/api/admin/entidades/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const batch = adminDb.batch();
    const cols = ["usuarios","operaciones","sucursales","fondeadores","credencialesCuad","logs_operaciones"];
    for (const col of cols) {
      const snap = await adminDb.collection(col).where("entidadId","==",id).get();
      snap.docs.forEach(d => batch.delete(d.ref));
    }
    batch.delete(adminDb.collection("entidades").doc(id));
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[DELETE entidad]", e);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    await adminDb.collection("entidades").doc(id).update({
      comisiones: body.comisiones,
      fechaActualizacion: new Date(),
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[PATCH comisiones]", e);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
