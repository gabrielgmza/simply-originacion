// app/api/fondeo/portal/route.ts
// GET → datos del portal para el fondeador autenticado (uid en header)
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, doc, getDoc, getDocs,
  query, where, orderBy
} from "firebase/firestore";
import { calcularContabilidad } from "@/lib/fondeo/subasta-motor";

export async function POST(request: Request) {
  try {
    const { fondeadorId } = await request.json();
    if (!fondeadorId) return NextResponse.json({ error: "Falta fondeadorId" }, { status: 400 });

    // Cargar fondeador
    const fondSnap = await getDoc(doc(db, "fondeadores", fondeadorId));
    if (!fondSnap.exists()) return NextResponse.json({ error: "Fondeador no encontrado" }, { status: 404 });
    const fond = { id: fondSnap.id, ...fondSnap.data() } as any;

    const permisos = fond.portalPermisos || {};

    // Operaciones asignadas a este fondeador
    const opsSnap = await getDocs(
      query(collection(db, "operaciones"),
        where("fondeo.fondeadorId", "==", fondeadorId),
        orderBy("fechaCreacion", "desc"))
    );

    // Para cada op, cargar pagos
    const ops = await Promise.all(opsSnap.docs.map(async d => {
      const op = { id: d.id, ...d.data() as any };

      const pagosSnap = await getDocs(
        query(collection(db, "pagos"), where("operacionId", "==", d.id))
      );
      const pagos = pagosSnap.docs.map(p => ({
        fecha: p.data().fecha?.toDate?.()?.toISOString() || null,
        monto: p.data().monto,
      }));
      (op as any)._totalPagado = pagos.reduce((a, p) => a + p.monto, 0);
      (op as any)._pagos = pagos;
      return op;
    }));

    // Contabilidad
    const contabilidad = calcularContabilidad(ops);

    // Tendencia mensual (últimos 6 meses)
    const hoy = new Date();
    const tendencia = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoy); d.setMonth(d.getMonth() - (5 - i));
      const m = d.getMonth(); const a = d.getFullYear();
      const opsDelMes = ops.filter(o => {
        const f = (o as any).fechaCreacion?.toDate?.();
        return f && f.getMonth() === m && f.getFullYear() === a;
      });
      return {
        mes:        d.toLocaleString("es-AR", { month: "short" }),
        asignadas:  opsDelMes.length,
        monto:      opsDelMes.reduce((a, o) => a + ((o as any).financiero?.montoSolicitado || 0), 0),
        cobrado:    opsDelMes.reduce((a, o) => a + ((o as any)._totalPagado || 0), 0),
      };
    });

    // Construir respuesta según permisos
    const response: any = {
      fondeador: {
        id:     fond.id,
        nombre: fond.nombre,
        tna:    fond.tnaPropia,
      },
      permisos,
    };

    if (permisos.verCartera !== false) {
      response.resumen = {
        totalOps:    ops.length,
        enMora:      ops.filter(o => (o as any).estado === "EN_MORA").length,
        liquidadas:  ops.filter(o => ["LIQUIDADO","EN_MORA","FINALIZADO"].includes((o as any).estado)).length,
        ...contabilidad,
      };
    }

    if (permisos.verEstadisticas !== false) {
      response.tendencia = tendencia;
    }

    if (permisos.verContabilidad) {
      response.contabilidad = contabilidad;
    }

    if (permisos.verHistorial !== false) {
      response.operaciones = ops.map(o => ({
        id:      (o as any).id,
        estado:  (o as any).estado,
        cliente: permisos.verLegajos ? (o as any).cliente : {
          nombre: (o as any).cliente?.nombre,
          dni:    (o as any).cliente?.dni,
        },
        financiero:  (o as any).financiero,
        fondeo:      (o as any).fondeo,
        fechaCreacion: (o as any).fechaCreacion?.toDate?.()?.toISOString() || null,
        totalPagado: (o as any)._totalPagado,
        legajo:      permisos.verLegajos ? {
          dniFrenteUrl: (o as any).legajo?.dniFrenteUrl,
          dniDorsoUrl:  (o as any).legajo?.dniDorsoUrl,
          selfieUrl:    (o as any).legajo?.selfieUrl,
          firmaUrl:     (o as any).legajo?.firmaUrl,
        } : undefined,
        pagos: permisos.verPlanCuotas ? (o as any)._pagos : undefined,
      }));
    }

    return NextResponse.json({ success: true, ...response });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
