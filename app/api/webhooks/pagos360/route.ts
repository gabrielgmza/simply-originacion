import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    if (!payload || !payload.operacionId) {
      return NextResponse.json({ error: "Faltan parametros requeridos" }, { status: 400 });
    }

    const { operacionId, estado, motivoRechazo } = payload;
    
    const operacionRef = doc(db, "operaciones", operacionId);
    const operacionSnap = await getDoc(operacionRef);

    if (!operacionSnap.exists()) {
      return NextResponse.json({ error: "Operacion no encontrada" }, { status: 404 });
    }

    const operacionData = operacionSnap.data();
    const intentosActuales = operacionData.intentosCobro || 0;

    if (estado === "success" || estado === "aprobado") {
      await updateDoc(operacionRef, {
        estado: "FINALIZADO",
        "pagos360.ultimoEstado": "COBRADO",
        "pagos360.fechaCobro": serverTimestamp(),
        fechaActualizacion: serverTimestamp()
      });
      return NextResponse.json({ message: "Operacion cobrada exitosamente" }, { status: 200 });
    } 
    
    if (estado === "rejected" || estado === "rechazado") {
      if (intentosActuales === 0) {
        const fechaReintento = new Date();
        fechaReintento.setDate(fechaReintento.getDate() + 5);

        await updateDoc(operacionRef, {
          intentosCobro: 1,
          estado: "REINTENTO_PROGRAMADO",
          "pagos360.ultimoEstado": "RECHAZADO",
          "pagos360.motivo": motivoRechazo || "Sin fondos",
          "pagos360.fechaProximoIntento": fechaReintento,
          fechaActualizacion: serverTimestamp()
        });
        return NextResponse.json({ message: "Rechazo registrado. Reintento a 5 dias programado." }, { status: 200 });
      } else {
        await updateDoc(operacionRef, {
          intentosCobro: intentosActuales + 1,
          estado: "MORA",
          "pagos360.ultimoEstado": "RECHAZADO_DEFINITIVO",
          "pagos360.motivo": motivoRechazo || "Fondos insuficientes (Reintento fallido)",
          fechaActualizacion: serverTimestamp()
        });
        return NextResponse.json({ message: "Rechazo definitivo. Operacion pasada a MORA." }, { status: 200 });
      }
    }

    return NextResponse.json({ message: "Estado ignorado" }, { status: 200 });

  } catch (error: any) {
    console.error("Error en webhook Pagos360:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
