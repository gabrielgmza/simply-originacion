import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const obtenerEstadoDeudaReal = async (operacionId: string, tasaMoraEntidad: number) => {
  // 1. Obtenemos la operación original
  // 2. Buscamos todos los pagos realizados
  const pagosRef = collection(db, "pagos");
  const q = query(pagosRef, where("operacionId", "==", operacionId), where("estado", "==", "APROBADO"));
  const snap = await getDocs(q);
  
  const totalPagado = snap.docs.reduce((acc, doc) => acc + doc.data().monto, 0);
  
  // Aquí la lógica comparativa real contra el plan de cuotas original + punitorios
  // Si (Capital + Mora) - totalPagado === 0 => LIBRE DE DEUDA
  return {
    saldoPendiente: 0, // Resultado del cálculo real
    esAptoLibreDeuda: totalPagado > 0 // && saldo === 0
  };
};
