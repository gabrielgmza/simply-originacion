import { NextResponse } from "next/server";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: Request) {
  // Validación de seguridad para que solo el sistema dispare esto
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('No autorizado', { status: 401 });
  }

  try {
    const q = query(collection(db, "operaciones"), where("estado", "in", ["ACTIVO", "PENDIENTE_FIRMA"]));
    const snap = await getDocs(q);
    
    let actualizados = 0;

    for (const operacionDoc of snap.docs) {
      const data = operacionDoc.data();
      const cuil = data.cliente.cuil;

      // Consultamos la API del BCRA (usamos nuestra propia ruta interna)
      const resBcra = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/bcra/consultar`, {
        method: "POST",
        body: JSON.stringify({ cuil })
      });
      
      const infoBcra = await resBcra.json();

      if (resBcra.ok) {
        await updateDoc(doc(db, "operaciones", operacionDoc.id), {
          "cliente.situacionCrediticiaActualizada": infoBcra.situacionCrediticia,
          "cliente.ultimaActualizacionCuad": serverTimestamp(),
          "cliente.alertaRiesgo": infoBcra.situacionCrediticia > 2 // Marcamos alerta si empeoró
        });
        actualizados++;
      }
    }

    return NextResponse.json({ success: true, procesados: actualizados });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
