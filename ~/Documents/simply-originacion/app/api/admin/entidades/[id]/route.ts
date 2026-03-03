import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const batch = adminDb.batch();
    for (const col of ["usuarios","operaciones","sucursales","fondeadores","credencialesCuad","logs_operaciones"]) {
      const snap = await adminDb.collection(col).where("entidadId","==",id).get();
      snap.docs.forEach(d => batch.delete(d.ref));
    }
    batch.delete(adminDb.collection("entidades").doc(id));
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const u: Record<string, any> = { fechaActualizacion: new Date() };
    if (body.comisiones)         u.comisiones = body.comisiones;
    if (body.modulosHabilitados) u.modulosHabilitados = body.modulosHabilitados;
    if (body.datos) {
      const d = body.datos;
      if (d.razonSocial)      u.razonSocial = d.razonSocial;
      if (d.nombreFantasia)   u.nombreFantasia = d.nombreFantasia;
      if (d.cuit)             u.cuit = d.cuit;
      if (d.emailContacto)    u["contacto.email"] = d.emailContacto;
      if (d.telefonoContacto) u["contacto.telefono"] = d.telefonoContacto;
    }
    await adminDb.collection("entidades").doc(id).update(u);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
