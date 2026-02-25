import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const registrarPago = async (operacionId: string, montoPagado: number, detalle: any) => {
  // 1. Crear el Recibo Oficial de la Entidad
  const recibo = await addDoc(collection(db, "recibos"), {
    operacionId,
    monto: montoPagado,
    fecha: serverTimestamp(),
    metodo: detalle.metodo, // Pagos360, MercadoPago, etc.
    distribucion: {
      mora: detalle.moraSaldada,
      capital: detalle.capitalSaldado
    }
  });

  return recibo.id;
};
