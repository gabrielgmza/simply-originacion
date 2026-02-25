import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { operacionId, entidadId } = await request.json();

    const opRef = doc(db, "operaciones", operacionId);
    const opSnap = await getDoc(opRef);
    if (!opSnap.exists()) throw new Error("Operacion no encontrada");
    const operacion = opSnap.data();

    const entSnap = await getDoc(doc(db, "entidades", entidadId));
    const configPagos = entSnap.data()?.configuracion?.pagos360;

    if (!configPagos?.apiKey) {
      return NextResponse.json({ error: "La entidad no tiene configurada la API de Pagos360" }, { status: 400 });
    }

    // Aquí simulamos la llamada a Pagos360 (Debito Automatico / Adhesion CBU)
    // En produccion se usa: fetch('https://api.pagos360.com/v1/adhesion', ...)
    
    const respuestaSimulada = {
      id_pago360: "P360-" + Math.random().toString(36).toUpperCase().substring(2,10),
      estado: "PROCESANDO"
    };

    await updateDoc(opRef, {
      "financiero.id_externo_pagos": respuestaSimulada.id_pago360,
      "financiero.estado_sincronizacion": "SINCRONIZADO",
      fechaActualizacion: serverTimestamp()
    });

    await addDoc(collection(db, "logs_operaciones"), {
      operacionId, entidadId, usuario: "SISTEMA",
      accion: "PAGOS360_SYNC", detalles: `Sincronizacion exitosa. ID Externo: ${respuestaSimulada.id_pago360}`,
      fecha: serverTimestamp()
    });

    return NextResponse.json({ success: true, id: respuestaSimulada.id_pago360 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
