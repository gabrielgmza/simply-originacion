import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { legajoId, dni, nombreCliente, entidadId, vendedorId } = await request.json();

    if (!legajoId || !dni || !entidadId) {
      return NextResponse.json({ error: "Faltan datos requeridos." }, { status: 400 });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 72);

    await addDoc(collection(db, "onboarding_tokens"), {
      token,
      legajoId,
      dni,
      nombreCliente: nombreCliente || "",
      entidadId,
      vendedorId: vendedorId || null,
      estado: "PENDIENTE",
      pasos: { dniFrente: false, dniDorso: false, selfie: false, firma: false, cbu: false, terminos: false },
      archivos: { dniFrente: null, dniDorso: null, selfie: null, firma: null },
      cbu: "",
      expiracion: expiracion.toISOString(),
      creadoEn: serverTimestamp(),
      completadoEn: null,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://simply-originacion.vercel.app";
    const link = `${baseUrl}/onboarding/${token}`;

    return NextResponse.json({ success: true, token, link });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
