import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { operacionId, entidadId } = await request.json();
    const opRef = doc(db, "operaciones", operacionId);
    const opSnap = await getDoc(opRef);
    if (!opSnap.exists()) throw new Error("Operacion no encontrada");
    const entSnap = await getDoc(doc(db, "entidades", entidadId));
    const configPagos = entSnap.data()?.configuracion?.pagos360;
    if (!configPagos?.apiKey) return NextResponse.json({ error: "Falta API Key Pagos360" }, { status: 400 });
    
    const idSimulado = "P360-" + Math.random().toString(36).toUpperCase().substring(2,10);

    await updateDoc(opRef, {
      "financiero.id_externo_pagos": idSimulado,
      "financiero.estado_sincronizacion": "SINCRONIZADO",
      fechaActualizacion: serverTimestamp()
    });

    await addDoc(collection(db, "logs_operaciones"), {
      operacionId, entidadId, usuario: "SISTEMA",
      accion: "PAGOS360_SYNC", detalles: `ID Externo: ${idSimulado}`,
      fecha: serverTimestamp()
    });

    return NextResponse.json({ success: true, id: idSimulado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
