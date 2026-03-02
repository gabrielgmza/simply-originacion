import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { enviarWhatsApp } from "@/lib/notificaciones/whatsapp";
import { crearNotificacion } from "@/lib/notificaciones/internas";

export async function POST(request: Request) {
  try {
    const { operacionId } = await request.json();
    if (!operacionId) return NextResponse.json({ error: "ID faltante" }, { status: 400 });

    const opRef = doc(db, "operaciones", operacionId);
    const opSnap = await getDoc(opRef);
    if (!opSnap.exists()) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const data = opSnap.data();

    await updateDoc(opRef, {
      estado: "LIQUIDADO",
      fechaLiquidacion: serverTimestamp(),
    });

    const telefono = data.cliente?.telefono?.replace(/\D/g, "");
    if (telefono) {
      await enviarWhatsApp({
        entidadId: data.entidadId,
        telefono,
        evento: "CREDITO_LIQUIDADO",
        datos: {
          nombreCliente: data.cliente?.nombre || "Cliente",
          monto: data.financiero?.montoSolicitado,
          cbuUltimos4: data.onboarding?.cbu?.slice(-4) || "XXXX",
        },
        operacionId,
      });
    }

    // Notificación interna al equipo
    await crearNotificacion({
      entidadId: data.entidadId,
      tipo: "LISTO_LIQUIDAR",
      titulo: "Crédito liquidado",
      descripcion: `${data.cliente?.nombre} — $${(data.financiero?.montoSolicitado || 0).toLocaleString("es-AR")} desembolsado`,
      operacionId,
      linkDestino: "/dashboard/cartera",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
