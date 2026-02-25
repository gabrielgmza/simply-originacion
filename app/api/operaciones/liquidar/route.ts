import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { enviarNotificacionLiquidacion } from "@/lib/notificaciones/whatsapp";

export async function POST(request: Request) {
  try {
    const { operacionId } = await request.json();
    if (!operacionId) return NextResponse.json({ error: "ID faltante" }, { status: 400 });

    const opRef = doc(db, "operaciones", operacionId);
    const opSnap = await getDoc(opRef);

    if (!opSnap.exists()) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    const data = opSnap.data();

    // 1. Actualizamos estado en Firebase con timestamp oficial
    await updateDoc(opRef, { 
      estado: "LIQUIDADO",
      fechaLiquidacion: serverTimestamp()
    });

    // 2. Disparos WhatsApp (Tomando datos del legajo)
    await enviarNotificacionLiquidacion({
      telefono: "549261XXXXXXX", 
      cliente: data.cliente?.nombre || "Cliente",
      monto: data.financiero?.montoSolicitado || 0,
      operacionId: operacionId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Fallo en proceso de liquidación" }, { status: 500 });
  }
}
