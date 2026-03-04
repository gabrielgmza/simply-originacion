// app/api/usuarios/crear/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { nombre, email, password, rol, sucursalId, entidadId } = await req.json();

    if (!nombre || !email || !password || !rol || !entidadId)
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });

    // Crear en Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: nombre,
    });

    // Crear en Firestore
    await adminDb.collection("usuarios").doc(userRecord.uid).set({
      uid:        userRecord.uid,
      nombre,
      email,
      rol,
      entidadId,
      sucursalId: sucursalId || null,
      activo:     true,
      fechaCreacion: new Date(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error: any) {
    // Firebase Auth error codes
    if (error.code === "auth/email-already-exists")
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
