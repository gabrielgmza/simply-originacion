import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type AsientoTipo = 'LIQUIDACION' | 'COBRO_CUOTA' | 'MORA' | 'GASTO_BANCARIO';

interface Movimiento {
  cuentaId: string;
  cuentaNombre: string;
  debe: number;
  haber: number;
}

export async function registrarAsiento(
  entidadId: string, 
  operacionId: string, 
  tipo: AsientoTipo, 
  movimientos: Movimiento[]
) {
  try {
    const asiento = {
      entidadId,
      operacionId,
      tipo,
      fecha: serverTimestamp(),
      totalDebe: movimientos.reduce((sum, m) => sum + m.debe, 0),
      totalHaber: movimientos.reduce((sum, m) => sum + m.haber, 0),
      movimientos
    };

    // Validación de Partida Doble: Debe = Haber
    if (Math.abs(asiento.totalDebe - asiento.totalHaber) > 0.01) {
      throw new Error("Error contable: El asiento no balancea.");
    }

    await addDoc(collection(db, "contabilidad_asientos"), asiento);
    return { success: true };
  } catch (error) {
    console.error("Error en motor contable:", error);
    return { success: false, error };
  }
}
