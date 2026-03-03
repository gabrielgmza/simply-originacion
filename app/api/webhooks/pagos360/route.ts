// app/api/webhooks/pagos360/route.ts
// Reemplaza el webhook anterior con manejo completo de eventos
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, updateDoc, addDoc,
  collection, serverTimestamp
} from "firebase/firestore";

// Estados que Pagos 360 puede enviar
// "paid" | "rejected" | "pending" | "reversed" | "in_process"

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log("[Webhook P360]", JSON.stringify(payload));

    // Pagos 360 puede enviar el operacionId como external_reference o en metadata
    const externalRef = payload?.external_reference
      || payload?.metadata?.external_id
      || payload?.operacionId;

    if (!externalRef)
      return NextResponse.json({ error: "Sin referencia de operación" }, { status: 400 });

    // El external_reference puede ser "operacionId_cuota_N" — extraemos el operacionId
    const operacionId = externalRef.split("_cuota_")[0];
    const evento      = (payload?.status || payload?.estado || "").toLowerCase();

    const opRef  = doc(db, "operaciones", operacionId);
    const opSnap = await getDoc(opRef);
    if (!opSnap.exists())
      return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

    const op        = opSnap.data() as any;
    const entidadId = op.entidadId;
    const monto     = payload?.amount || payload?.monto || op.financiero?.valorCuota || 0;
    const nroCuota  = op.pagos360?.intentosCobro || 1;

    // Cargar config WhatsApp si está disponible
    const entSnap  = await getDoc(doc(db, "entidades", entidadId));
    const wsConf   = entSnap.data()?.configuracion?.whatsapp;
    const cfgP360  = entSnap.data()?.configuracion?.pagos360 || {};

    // ── COBRO APROBADO ─────────────────────────────────────────────────────
    if (["paid", "aprobado", "success", "approved"].includes(evento)) {

      // Registrar pago en colección pagos
      const pagoRef = await addDoc(collection(db, "pagos"), {
        operacionId, entidadId,
        monto,
        nroCuota,
        origen:        "PAGOS360",
        requestId:     payload?.id || payload?.uid,
        estado:        "APROBADO",
        fecha:         serverTimestamp(),
        fechaCreacion: serverTimestamp(),
      });

      // Verificar si es la última cuota
      const totalCuotas = op.financiero?.cuotas || 1;
      const nuevasCuotasPagadas = nroCuota;
      const cancelado = nuevasCuotasPagadas >= totalCuotas;

      await updateDoc(opRef, {
        estado:                     cancelado ? "FINALIZADO" : "LIQUIDADO",
        "pagos360.ultimoEstado":    "COBRADO",
        "pagos360.fechaUltimoPago": serverTimestamp(),
        "pagos360.cuotasPagadas":   nroCuota,
        fechaActualizacion:         serverTimestamp(),
      });

      // WhatsApp al cliente
      if (wsConf?.activo && wsConf?.accessToken && wsConf?.phoneNumberId && op.cliente?.telefono) {
        const msg = cancelado
          ? `✅ *¡Crédito cancelado!*\n\nHola ${op.cliente?.nombre?.split(" ")[0]}! Realizamos el cobro de la cuota ${nroCuota} por $${monto.toLocaleString("es-AR")} y tu crédito quedó *completamente cancelado*. ¡Gracias!`
          : `✅ *Cobro exitoso*\n\nHola ${op.cliente?.nombre?.split(" ")[0]}! Debitamos la cuota ${nroCuota}/${totalCuotas} por *$${monto.toLocaleString("es-AR")}* de tu cuenta. ¡Gracias!`;
        await fetch(`https://graph.facebook.com/v18.0/${wsConf.phoneNumberId}/messages`, {
          method:  "POST",
          headers: { "Authorization": `Bearer ${wsConf.accessToken}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ messaging_product: "whatsapp", to: op.cliente.telefono.replace(/\D/g, ""), type: "text", text: { body: msg } }),
        }).catch(e => console.error("[WS cobro]", e));
      }

      await addDoc(collection(db, "auditoria"), {
        operacionId, entidadId, accion: "P360_COBRO_APROBADO",
        detalles: `Cuota ${nroCuota} — $${monto} — PagoId: ${pagoRef.id}`,
        usuarioEmail: "sistema", fecha: serverTimestamp(),
      });

      return NextResponse.json({ received: true, accion: "COBRO_APROBADO" });
    }

    // ── COBRO RECHAZADO ────────────────────────────────────────────────────
    if (["rejected", "rechazado", "failed", "error"].includes(evento)) {
      const intentos    = op.pagos360?.intentosRechazo || 0;
      const maxReintentos = cfgP360.maxReintentos || 2;
      const diasReintento = cfgP360.diasReintento  || 5;

      if (intentos < maxReintentos) {
        // Programar reintento
        const fechaReintento = new Date();
        fechaReintento.setDate(fechaReintento.getDate() + diasReintento);

        await updateDoc(opRef, {
          "pagos360.ultimoEstado":       "RECHAZADO",
          "pagos360.intentosRechazo":    intentos + 1,
          "pagos360.motivo":             payload?.rejection_reason || payload?.motivo || "Sin fondos",
          "pagos360.fechaProxReintento": fechaReintento.toISOString(),
          estado:                        "REINTENTO_PROGRAMADO",
          fechaActualizacion:            serverTimestamp(),
        });

        // WhatsApp al cliente
        if (wsConf?.activo && wsConf?.accessToken && wsConf?.phoneNumberId && op.cliente?.telefono) {
          const msg = `⚠️ *Cobro rechazado*\n\nHola ${op.cliente?.nombre?.split(" ")[0]}! No pudimos debitar la cuota ${nroCuota} de tu cuenta. Verificá que tengas fondos disponibles. Reintentaremos en ${diasReintento} días.`;
          await fetch(`https://graph.facebook.com/v18.0/${wsConf.phoneNumberId}/messages`, {
            method:  "POST",
            headers: { "Authorization": `Bearer ${wsConf.accessToken}`, "Content-Type": "application/json" },
            body:    JSON.stringify({ messaging_product: "whatsapp", to: op.cliente.telefono.replace(/\D/g, ""), type: "text", text: { body: msg } }),
          }).catch(e => console.error("[WS rechazo]", e));
        }

      } else {
        // Reintentos agotados → mora
        await updateDoc(opRef, {
          estado:                     "EN_MORA",
          "pagos360.ultimoEstado":    "RECHAZADO_DEFINITIVO",
          "pagos360.motivo":          payload?.rejection_reason || "Fondos insuficientes — reintentos agotados",
          fechaActualizacion:         serverTimestamp(),
        });

        if (wsConf?.activo && wsConf?.accessToken && wsConf?.phoneNumberId && op.cliente?.telefono) {
          const msg = `🔴 *Tu crédito entró en mora*\n\nHola ${op.cliente?.nombre?.split(" ")[0]}! Luego de ${maxReintentos + 1} intentos de cobro sin éxito, tu crédito pasó a estado de mora. Comunicate con nosotros para regularizar.`;
          await fetch(`https://graph.facebook.com/v18.0/${wsConf.phoneNumberId}/messages`, {
            method:  "POST",
            headers: { "Authorization": `Bearer ${wsConf.accessToken}`, "Content-Type": "application/json" },
            body:    JSON.stringify({ messaging_product: "whatsapp", to: op.cliente.telefono.replace(/\D/g, ""), type: "text", text: { body: msg } }),
          }).catch(e => console.error("[WS mora]", e));
        }
      }

      await addDoc(collection(db, "auditoria"), {
        operacionId, entidadId, accion: "P360_COBRO_RECHAZADO",
        detalles: `Intento ${intentos + 1} — ${payload?.rejection_reason || "Sin fondos"}`,
        usuarioEmail: "sistema", fecha: serverTimestamp(),
      });

      return NextResponse.json({ received: true, accion: "COBRO_RECHAZADO" });
    }

    // Evento no manejado — responder 200 para que P360 no reintente
    return NextResponse.json({ received: true, accion: "IGNORADO", evento });

  } catch (error: any) {
    console.error("[Webhook P360 error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
