// app/api/webhooks/pagos360/route.ts — con emails automaticos
import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { dispararEmail } from "@/lib/email/motor";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const externalRef = payload?.external_reference || payload?.metadata?.external_id || payload?.operacionId;
    if (!externalRef) return NextResponse.json({ error: "Sin referencia" }, { status: 400 });

    const operacionId = externalRef.split("_cuota_")[0];
    const evento      = (payload?.status || payload?.estado || "").toLowerCase();

    const opRef  = doc(db, "operaciones", operacionId);
    const opSnap = await getDoc(opRef);
    if (!opSnap.exists()) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const op        = opSnap.data() as any;
    const entidadId = op.entidadId;
    const monto     = payload?.amount || op.financiero?.valorCuota || 0;
    const nroCuota  = op.pagos360?.intentosCobro || 1;
    const totalCuotas = op.financiero?.cuotas || 1;
    const email     = op.cliente?.email;

    const entSnap = await getDoc(doc(db, "entidades", entidadId));
    const cfgP360 = entSnap.data()?.configuracion?.pagos360 || {};

    // COBRO APROBADO
    if (["paid", "aprobado", "success", "approved"].includes(evento)) {
      await addDoc(collection(db, "pagos"), {
        operacionId, entidadId, monto, nroCuota,
        origen: "PAGOS360", requestId: payload?.id,
        estado: "APROBADO", fecha: serverTimestamp(), fechaCreacion: serverTimestamp(),
      });

      const cancelado = nroCuota >= totalCuotas;
      await updateDoc(opRef, {
        estado: cancelado ? "FINALIZADO" : "LIQUIDADO",
        "pagos360.ultimoEstado": "COBRADO",
        "pagos360.fechaUltimoPago": serverTimestamp(),
        "pagos360.cuotasPagadas": nroCuota,
        fechaActualizacion: serverTimestamp(),
      });

      // Email cobro exitoso
      if (email) {
        dispararEmail(entidadId, "COBRO_EXITOSO", email, {
          nombre: op.cliente.nombre, monto, nroCuota, totalCuotas,
        }).catch(e => console.error("[Email cobro exitoso]", e));
      }

      return NextResponse.json({ received: true, accion: "COBRO_APROBADO" });
    }

    // COBRO RECHAZADO
    if (["rejected", "rechazado", "failed", "error"].includes(evento)) {
      const intentos      = op.pagos360?.intentosRechazo || 0;
      const maxReintentos = cfgP360.maxReintentos || 2;
      const diasReintento = cfgP360.diasReintento  || 5;

      if (intentos < maxReintentos) {
        const fechaReintento = new Date();
        fechaReintento.setDate(fechaReintento.getDate() + diasReintento);

        await updateDoc(opRef, {
          "pagos360.ultimoEstado": "RECHAZADO",
          "pagos360.intentosRechazo": intentos + 1,
          "pagos360.motivo": payload?.rejection_reason || "Sin fondos",
          "pagos360.fechaProxReintento": fechaReintento.toISOString(),
          estado: "REINTENTO_PROGRAMADO",
          fechaActualizacion: serverTimestamp(),
        });

        if (email) {
          dispararEmail(entidadId, "COBRO_RECHAZADO", email, {
            nombre: op.cliente.nombre, monto, nroCuota,
            motivo: payload?.rejection_reason || "Sin fondos",
            fechaReintento: fechaReintento.toLocaleDateString("es-AR"),
          }).catch(e => console.error("[Email cobro rechazado]", e));
        }
      } else {
        await updateDoc(opRef, {
          estado: "EN_MORA",
          "pagos360.ultimoEstado": "RECHAZADO_DEFINITIVO",
          "pagos360.motivo": payload?.rejection_reason || "Reintentos agotados",
          fechaActualizacion: serverTimestamp(),
        });

        if (email) {
          dispararEmail(entidadId, "CREDITO_EN_MORA", email, {
            nombre: op.cliente.nombre,
            deuda: monto * Math.max(0, totalCuotas - nroCuota),
            diasMora: 0,
          }).catch(e => console.error("[Email mora]", e));
        }
      }

      return NextResponse.json({ received: true, accion: "COBRO_RECHAZADO" });
    }

    return NextResponse.json({ received: true, accion: "IGNORADO" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
