import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const { cupoMaximo, entidadId } = await request.json();
    if (!cupoMaximo || !entidadId)
      return NextResponse.json({ error: "Faltan parametros" }, { status: 400 });

    // Fondeadores activos
    const snap = await getDocs(query(collection(db, "fondeadores"),
      where("entidadId", "==", entidadId), where("activo", "==", true)));
    const fondeadores = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    // Config de la entidad (capital propio)
    const entSnap = await getDoc(doc(db, "entidades", entidadId));
    const entConfig = entSnap.data()?.configuracion || {};

    const fuentes = [
      { id: "propio", nombre: "Capital Propio", tna: entConfig.tasaInteresBase || 120, plazoMax: 24 },
      ...fondeadores.map((f: any) => ({
        id: f.id, nombre: f.nombre,
        tna: f.tnaPropia || 120, plazoMax: f.plazoMaximo || 24
      }))
    ];

    const plazos = [6, 12, 18, 24];
    const propuestas: any[] = [];

    for (const fuente of fuentes) {
      for (const cuotas of plazos) {
        if (cuotas > fuente.plazoMax) continue;
        const tem = Math.pow(1 + fuente.tna / 100, 1 / 12) - 1;
        // Despejar capital dado que cuotaMensual <= cupoMaximo
        const factor = (tem * Math.pow(1 + tem, cuotas)) / (Math.pow(1 + tem, cuotas) - 1);
        const monto = Math.floor(cupoMaximo / factor / 1000) * 1000; // redondear a miles
        const cuotaMensual = Math.round(monto * factor);
        if (monto < 10000) continue;
        propuestas.push({
          fondeadorId:     fuente.id,
          fondeadorNombre: fuente.nombre,
          tna:             fuente.tna,
          cuotas,
          monto,
          cuotaMensual,
        });
      }
    }

    // Ordenar por monto desc, mostrar max 6
    propuestas.sort((a, b) => b.monto - a.monto);
    return NextResponse.json({ propuestas: propuestas.slice(0, 6) });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
