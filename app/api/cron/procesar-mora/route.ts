import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, increment } from "firebase/firestore";

export async function GET() {
  try {
    // Lógica para ejecutar entre 2am y 5am
    const hoy = new Date();
    const q = query(collection(db, "operaciones"), where("estado", "==", "LIQUIDADO"));
    const snap = await getDocs(q);

    snap.forEach(async (documento) => {
      const data = documento.data();
      // Cálculo de punitorio diario del 0.12% sobre el saldo
      const punitorio = (data.financiero?.montoSolicitado || 0) * 0.0012;
      
      await updateDoc(doc(db, "operaciones", documento.id), {
        "financiero.interesesPunitorios": increment(punitorio),
        ultimaActualizacionMora: hoy.toISOString()
      });
    });

    return NextResponse.json({ success: true, mensaje: "Mora procesada" });
  } catch (error) {
    return NextResponse.json({ error: "Error en proceso nocturno" }, { status: 500 });
  }
}
