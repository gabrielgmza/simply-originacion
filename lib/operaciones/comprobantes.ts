import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export const vincularComprobante = async (operacionId: string, urlArchivo: string) => {
  const opRef = doc(db, "operaciones", operacionId);
  
  await updateDoc(opRef, {
    "desembolso.comprobanteUrl": urlArchivo,
    "desembolso.fechaTransferencia": serverTimestamp(),
    "estado": "TRANSFERIDO",
    "notificadoTransferencia": false // Trigger para el servicio de avisos
  });

  return { success: true };
};
