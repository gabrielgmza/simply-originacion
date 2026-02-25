import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, increment } from "firebase/firestore";

export async function GET(request: Request) {
  // Validación de seguridad para que solo el CRON pueda dispararlo
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('No autorizado', { status: 401 });
  }

  try {
    const operacionesSnap = await getDocs(collection(db, "operaciones"));
    
    const promesas = operacionesSnap.docs.map(async (documento) => {
      const data = documento.data();
      const entidadId = data.entidadId;
      
      // 1. Obtenemos la configuración de la entidad ("Su mundo aparte")
      const entidadSnap = await getDocs(collection(db, "entidades")); // Simplificado para el ejemplo
      const configEntidad = entidadSnap.docs.find(e => e.id === entidadId)?.data()?.configuracion;
      
      const tasaPunitoria = configEntidad?.tasaPunitoriaDiaria || 0.12; // Valor por defecto si no existe

      // 2. Calculamos punitorio diario sobre el saldo vencido
      const interesDiario = (data.financiero?.saldoPendiente || 0) * (tasaPunitoria / 100);

      // 3. Actualizamos: Mora acumulada + Refresco de CUAD
      return updateDoc(doc(db, "operaciones", documento.id), {
        "financiero.interesesPunitorios": increment(interesDiario),
        "financiero.cuadRefrescado": new Date().toISOString(),
        "estadoCuad": "ACTUALIZADO_CRON"
      });
    });

    await Promise.all(promesas);
    return NextResponse.json({ success: true, procesados: promesas.length });
  } catch (error) {
    return NextResponse.json({ error: "Fallo en el proceso nocturno" }, { status: 500 });
  }
}
