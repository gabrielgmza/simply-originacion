// app/api/cron/resumen-email/route.ts
// Vercel Cron: 07:00 AR (10:00 UTC) todos los días
// vercel.json → { "path": "/api/cron/resumen-email", "schedule": "0 10 * * *" }

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query,
  where, doc, getDoc, Timestamp
} from "firebase/firestore";
import { dispararEmail } from "@/lib/email/motor";

const DIAS_MORA_CRITICA = 15;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hoy   = new Date();
  const ayer  = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const fecha = hoy.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

  let procesadas = 0; let errores = 0;

  try {
    // Obtener todas las entidades con email habilitado
    const entSnap = await getDocs(
      query(collection(db, "entidades"), where("modulosHabilitados.email", "==", true))
    );

    for (const entDoc of entSnap.docs) {
      const entidadId = entDoc.id;
      const ent       = entDoc.data() as any;
      const cfgEmail  = ent.configuracion?.email || {};
      const emailGerente = ent.gerenteEmail || ent.contacto?.email;

      if (!emailGerente) continue;

      try {
        // ── Calcular métricas del día anterior ────────────────────────────
        const [opsSnap, pagosSnap, moraSnap] = await Promise.all([
          getDocs(query(collection(db, "operaciones"),
            where("entidadId", "==", entidadId),
            where("fechaCreacion", ">=", Timestamp.fromDate(ayer)))),
          getDocs(query(collection(db, "pagos"),
            where("entidadId", "==", entidadId),
            where("fecha", ">=", Timestamp.fromDate(ayer)))),
          getDocs(query(collection(db, "operaciones"),
            where("entidadId", "==", entidadId),
            where("estado", "==", "EN_MORA"))),
        ]);

        const ops        = opsSnap.docs.map(d => d.data() as any);
        const pagos      = pagosSnap.docs.map(d => d.data() as any);
        const moraOps    = moraSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        const liquidados      = ops.filter(o => o.estado === "LIQUIDADO").length;
        const montoLiquidado  = ops.filter(o => o.estado === "LIQUIDADO").reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
        const cobrosExitosos  = pagos.filter(p => p.estado === "APROBADO").length;
        const cobrosRechazados= pagos.filter(p => p.estado !== "APROBADO").length;

        // ── Resumen diario ─────────────────────────────────────────────────
        if (cfgEmail.RESUMEN_DIARIO !== false) {
          await dispararEmail(entidadId, "RESUMEN_DIARIO", emailGerente, {
            fecha,
            operacionesNuevas: ops.length,
            liquidados,
            montoLiquidado,
            cobrosExitosos,
            cobrosRechazados,
            enMora: moraOps.length,
          });
        }

        // ── Alerta mora crítica ────────────────────────────────────────────
        if (cfgEmail.ALERTA_MORA_CRITICA !== false) {
          const casosCriticos = moraOps.filter(o => {
            const fechaMora = o.fechaActualizacion?.toDate?.() || null;
            if (!fechaMora) return false;
            const dias = Math.floor((hoy.getTime() - fechaMora.getTime()) / 86400000);
            return dias >= DIAS_MORA_CRITICA;
          });

          if (casosCriticos.length > 0) {
            await dispararEmail(entidadId, "ALERTA_MORA_CRITICA", emailGerente, {
              cantidad: casosCriticos.length,
              diasMora: DIAS_MORA_CRITICA,
              casos: casosCriticos.map(o => ({
                nombre: o.cliente?.nombre || "—",
                deuda:  (o.financiero?.valorCuota || 0) * Math.max(0, (o.financiero?.cuotas || 0) - (o.pagos360?.cuotasPagadas || 0)),
                dias:   Math.floor((hoy.getTime() - (o.fechaActualizacion?.toDate?.()?.getTime() || 0)) / 86400000),
              })),
            });
          }
        }

        procesadas++;
      } catch (e: any) {
        errores++;
        console.error(`[Cron email] Entidad ${entidadId}:`, e.message);
      }
    }

    return NextResponse.json({ success: true, procesadas, errores });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
