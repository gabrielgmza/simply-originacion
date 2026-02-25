import { db } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import { registrarAsiento } from "./engine";

export async function procesarDevengamientoDiario(entidadId: string) {
  const hoy = new Date();
  const q = query(
    collection(db, "operaciones"), 
    where("entidadId", "==", entidadId),
    where("estado", "==", "ACTIVO")
  );

  const snap = await getDocs(q);
  
  for (const operacionDoc of snap.docs) {
    const op = operacionDoc.data();
    const tna = op.financiero.tna;
    const capitalPendiente = op.financiero.montoBruto; // Simplificado para el ejemplo
    
    // Interés diario: (Capital * (TNA/100) / 365)
    const interesDiario = (capitalPendiente * (tna / 100)) / 365;

    if (interesDiario > 0) {
      await registrarAsiento(
        entidadId,
        operacionDoc.id,
        'GASTO_BANCARIO', // Usamos un tipo para intereses devengados
        [
          { cuentaId: '1.2.02', cuentaNombre: 'Intereses a Cobrar', debe: interesDiario, haber: 0 },
          { cuentaId: '4.1.01', cuentaNombre: 'Intereses Ganados', debe: 0, haber: interesDiario }
        ]
      );
    }
  }
}
