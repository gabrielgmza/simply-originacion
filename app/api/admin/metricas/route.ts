// app/api/admin/metricas/route.ts
// Solo accesible por MASTER_PAYSUR — verificado en el cliente por rol
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

export async function GET() {
  try {
    // ── 1. Cargar todas las entidades ────────────────────────────────────────
    const entSnap  = await getDocs(collection(db, "entidades"));
    const entidades = entSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    // ── 2. Cargar TODAS las operaciones (cross-tenant) ───────────────────────
    const opsSnap  = await getDocs(collection(db, "operaciones"));
    const ops      = opsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    // ── 3. KPIs globales ─────────────────────────────────────────────────────
    const totalOps          = ops.length;
    const cartaTotal        = ops
      .filter(o => ["LIQUIDADO","EN_MORA"].includes(o.estado))
      .reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
    const enMora            = ops.filter(o => o.estado === "EN_MORA").length;
    const totalOriginado    = ops
      .filter(o => !["RECHAZADO","PENDIENTE_DOCS"].includes(o.estado))
      .reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
    const porcMora          = totalOps > 0 ? Math.round((enMora / totalOps) * 100) : 0;

    // ── 4. Métricas por entidad ──────────────────────────────────────────────
    const metricasPorEntidad = entidades.map(ent => {
      const opsEnt      = ops.filter(o => o.entidadId === ent.id);
      const liquidadas  = opsEnt.filter(o => ["LIQUIDADO","EN_MORA","FINALIZADO"].includes(o.estado));
      const moraEnt     = opsEnt.filter(o => o.estado === "EN_MORA");
      const montoCartera= liquidadas.reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
      const montoMora   = moraEnt.reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
      const porcMoraEnt = liquidadas.length > 0 ? Math.round((moraEnt.length / liquidadas.length) * 100) : 0;

      // Última actividad
      const fechas = opsEnt
        .map(o => o.fechaCreacion?.toDate?.()?.getTime() || 0)
        .filter(Boolean);
      const ultimaActividad = fechas.length > 0 ? new Date(Math.max(...fechas)).toISOString() : null;

      // Días sin actividad
      const diasSinActividad = ultimaActividad
        ? Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / (86400000))
        : 999;

      // Integraciones activas
      const cfg = ent.configuracion || {};
      const integraciones = {
        whatsapp: !!(cfg.whatsapp?.activo && cfg.whatsapp?.accessToken),
        pagos360: !!(cfg.pagos360?.apiKey),
        vision:   !!(cfg.googleVisionApiKey),
        portal:   !!(cfg.portal?.activo),
        cuad:     !!(cfg.credenciales?.cuadUser),
      };

      // Comisión Paysur
      const comision = ent.comision || { tipo: "PORCENTUAL", valor: 0 };

      // Comisión mensual estimada
      let comisionMes = 0;
      if (comision.tipo === "FIJA_POR_CLIENTE") {
        comisionMes = opsEnt.filter(o => {
          const f = o.fechaCreacion?.toDate?.();
          return f && f.getMonth() === new Date().getMonth() && f.getFullYear() === new Date().getFullYear();
        }).length * (comision.valor || 0);
      } else if (comision.tipo === "PORCENTUAL") {
        const montoMes = opsEnt
          .filter(o => {
            const f = o.fechaCreacion?.toDate?.();
            return f && f.getMonth() === new Date().getMonth();
          })
          .reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
        comisionMes = montoMes * ((comision.valor || 0) / 100);
      } else if (comision.tipo === "FIJA_MENSUAL") {
        comisionMes = comision.valor || 0;
      }

      return {
        id:             ent.id,
        nombre:         ent.nombreFantasia || ent.razonSocial,
        provincia:      ent.provincia || "—",
        activa:         ent.activa !== false,
        totalOps:       opsEnt.length,
        liquidadas:     liquidadas.length,
        enMora:         moraEnt.length,
        montoCartera,
        montoMora,
        porcMora:       porcMoraEnt,
        ultimaActividad,
        diasSinActividad,
        integraciones,
        comision,
        comisionMes,
        colorPrimario:  cfg.colorPrimario || "#FF5E14",
      };
    });

    // ── 5. Tendencia mensual (últimos 6 meses) ───────────────────────────────
    const hoy     = new Date();
    const meses   = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoy);
      d.setMonth(d.getMonth() - (5 - i));
      return { mes: d.toLocaleString("es-AR", { month: "short" }), año: d.getFullYear(), m: d.getMonth(), a: d.getFullYear() };
    });

    const tendencia = meses.map(({ mes, m, a }) => {
      const opsDelMes = ops.filter(o => {
        const f = o.fechaCreacion?.toDate?.();
        return f && f.getMonth() === m && f.getFullYear() === a;
      });
      return {
        mes,
        originadas:  opsDelMes.length,
        monto:       opsDelMes.reduce((acc, o) => acc + (o.financiero?.montoSolicitado || 0), 0),
        mora:        opsDelMes.filter(o => o.estado === "EN_MORA").length,
      };
    });

    // ── 6. Alertas automáticas ───────────────────────────────────────────────
    const alertas: { tipo: string; mensaje: string; entidadId: string; nombre: string }[] = [];
    for (const m of metricasPorEntidad) {
      if (m.porcMora > 15)
        alertas.push({ tipo: "MORA_ALTA", mensaje: `${m.porcMora}% de mora`, entidadId: m.id, nombre: m.nombre });
      if (m.diasSinActividad > 30 && m.diasSinActividad < 999)
        alertas.push({ tipo: "SIN_ACTIVIDAD", mensaje: `${m.diasSinActividad} días sin operaciones`, entidadId: m.id, nombre: m.nombre });
      if (!m.integraciones.whatsapp && m.liquidadas > 0)
        alertas.push({ tipo: "SIN_WHATSAPP", mensaje: "WhatsApp no configurado", entidadId: m.id, nombre: m.nombre });
    }

    // ── 7. Comisión total estimada del mes ───────────────────────────────────
    const comisionTotalMes = metricasPorEntidad.reduce((a, m) => a + m.comisionMes, 0);

    return NextResponse.json({
      success: true,
      kpis: { totalOps, cartaTotal, enMora, porcMora, totalOriginado, totalEntidades: entidades.length, comisionTotalMes },
      metricasPorEntidad,
      tendencia,
      alertas,
    });

  } catch (error: any) {
    console.error("[Admin métricas]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
