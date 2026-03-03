// app/api/cron/cobros-pagos360/route.ts
// Vercel Cron: se ejecuta diariamente a las 09:00 AR
// vercel.json → { "crons": [{ "path": "/api/cron/cobros-pagos360", "schedule": "0 12 * * *" }] }

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query,
  where, doc, getDoc
} from "firebase/firestore";
import { iniciarCobro } from "@/lib/pagos360/cliente";

export async function GET(request: Request) {
  // Verificar cron secret para evitar ejecuciones no autorizadas
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let procesadas = 0; let errores = 0;

  try {
    // 1. Operaciones liquidadas con adhesión activa — vencimiento de cuota hoy
    const liquidadasSnap = await getDocs(
      query(collection(db, "operaciones"),
        where("estado", "in", ["LIQUIDADO"]),
        where("pagos360.estadoAdhesion", "==", "ADHERIDO"))
    );

    // 2. Operaciones con reintento programado para hoy
    const reintentosSnap = await getDocs(
      query(collection(db, "operaciones"),
        where("estado", "==", "REINTENTO_PROGRAMADO"))
    );

    const candidatas = [
      ...liquidadasSnap.docs.map(d => ({ id: d.id, ...d.data() as any })),
      ...reintentosSnap.docs.map(d => ({ id: d.id, ...d.data() as any })),
    ];

    for (const op of candidatas) {
      try {
        // Verificar vencimiento de cuota
        const fechaProx = op.pagos360?.fechaProxReintento
          ? new Date(op.pagos360.fechaProxReintento)
          : op.financiero?.fechaProximaCuota
            ? new Date(op.financiero.fechaProximaCuota?.toDate?.() || op.financiero.fechaProximaCuota)
            : null;

        if (fechaProx && fechaProx > hoy) continue; // no vencida aún

        const entSnap = await getDoc(doc(db, "entidades", op.entidadId));
        const apiKey  = entSnap.data()?.configuracion?.pagos360?.apiKey;
        if (!apiKey) continue;

        const nroCuota = (op.pagos360?.intentosCobro || 0) + 1;
        const monto    = op.financiero?.valorCuota || 0;
        if (!monto) continue;

        // Iniciar cobro via Pagos 360
        const res = await iniciarCobro(apiKey, {
          adhesion_uid: op.pagos360.adhesionUid,
          monto,
          descripcion:  `Cuota ${nroCuota} - ${op.cliente?.nombre} - ${op.id.slice(0,8).toUpperCase()}`,
          external_id:  `${op.id}_cuota_${nroCuota}`,
        });

        if (res.ok) procesadas++;
        else { errores++; console.error(`[Cron P360] Error op ${op.id}:`, res.error); }

        // Pequeña pausa para no saturar la API
        await new Promise(r => setTimeout(r, 200));

      } catch (e: any) {
        errores++;
        console.error(`[Cron P360] Excepción op ${op.id}:`, e.message);
      }
    }

    console.log(`[Cron P360] Procesadas: ${procesadas} | Errores: ${errores}`);
    return NextResponse.json({ success: true, procesadas, errores, fecha: hoy.toISOString() });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
