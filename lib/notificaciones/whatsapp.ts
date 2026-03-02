import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
export type EventoWhatsApp =
  | "CREDITO_APROBADO"
  | "CREDITO_LIQUIDADO"
  | "RECORDATORIO_VENCIMIENTO"
  | "AVISO_MORA"
  | "LINK_ONBOARDING"
  | "PROMESA_CONFIRMADA";

interface ConfigWhatsApp {
  activo: boolean;
  phoneNumberId: string;     // ID del número de teléfono en Meta
  accessToken: string;       // Token de acceso permanente de Meta
  telefonoNegocio: string;   // Número con código de país ej: 549261XXXXXXX
  nombreEntidad: string;
  eventos: Record<EventoWhatsApp, boolean>;
}

// ─── PLANTILLAS DE MENSAJES ───────────────────────────────────────────────────
// Nota: en producción estas deben estar aprobadas en Meta Business Manager
// como "message templates". Los textos deben coincidir exactamente.
const PLANTILLAS: Record<EventoWhatsApp, (datos: any) => string> = {
  CREDITO_APROBADO: (d) =>
    `✅ *¡Crédito Aprobado!*\n\nHola ${d.nombreCliente}, tu solicitud de crédito por *$${d.monto?.toLocaleString("es-AR")}* ha sido aprobada.\n\nEn breve te contactaremos para coordinar el desembolso.\n\n_${d.nombreEntidad}_`,

  CREDITO_LIQUIDADO: (d) =>
    `💰 *Crédito Liquidado*\n\nHola ${d.nombreCliente}, los fondos por *$${d.monto?.toLocaleString("es-AR")}* fueron transferidos a tu CBU ****${d.cbuUltimos4}.\n\nVerificá tu cuenta bancaria en las próximas horas.\n\n_${d.nombreEntidad}_`,

  RECORDATORIO_VENCIMIENTO: (d) =>
    `⏰ *Recordatorio de Pago*\n\nHola ${d.nombreCliente}, tu cuota de *$${d.valorCuota?.toLocaleString("es-AR")}* vence en 48 horas.\n\nRealizar el pago a tiempo evita cargos por mora.\n\n_${d.nombreEntidad}_`,

  AVISO_MORA: (d) =>
    `⚠️ *Aviso de Atraso*\n\nHola ${d.nombreCliente}, registramos un atraso en tu cuota de *$${d.valorCuota?.toLocaleString("es-AR")}*.\n\nComunicate con nosotros para regularizar tu situación y evitar punitorios adicionales.\n\n_${d.nombreEntidad}_`,

  LINK_ONBOARDING: (d) =>
    `📋 *Completá tu Documentación*\n\nHola ${d.nombreCliente}, para continuar con tu crédito necesitamos que completes tu documentación desde el siguiente enlace:\n\n🔗 ${d.link}\n\n_El link expira en 24 horas._\n\n_${d.nombreEntidad}_`,

  PROMESA_CONFIRMADA: (d) =>
    `📅 *Promesa de Pago Registrada*\n\nHola ${d.nombreCliente}, confirmamos tu compromiso de pago para el *${d.fechaPromesa}*.\n\nTe recordaremos el día anterior.\n\n_${d.nombreEntidad}_`,
};

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────
export async function enviarWhatsApp(params: {
  entidadId: string;
  telefono: string;          // Con código de país, sin +. Ej: 549261XXXXXXX
  evento: EventoWhatsApp;
  datos: Record<string, any>;
  operacionId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { entidadId, telefono, evento, datos, operacionId } = params;

  try {
    // 1. Obtener configuración de WhatsApp de la entidad
    const entidadSnap = await getDoc(doc(db, "entidades", entidadId));
    if (!entidadSnap.exists()) throw new Error("Entidad no encontrada");

    const entidadData = entidadSnap.data();
    const wsConfig: ConfigWhatsApp = entidadData.configuracion?.whatsapp;

    if (!wsConfig?.activo) {
      console.log(`[WhatsApp] Entidad ${entidadId} tiene WhatsApp desactivado.`);
      return { success: false, error: "WhatsApp desactivado para esta entidad" };
    }

    if (!wsConfig.eventos?.[evento]) {
      console.log(`[WhatsApp] Evento ${evento} desactivado para entidad ${entidadId}.`);
      return { success: false, error: `Evento ${evento} desactivado` };
    }

    if (!wsConfig.phoneNumberId || !wsConfig.accessToken) {
      throw new Error("Configuración de Meta incompleta (falta Phone Number ID o Access Token)");
    }

    // 2. Construir mensaje
    const mensaje = PLANTILLAS[evento]({ ...datos, nombreEntidad: wsConfig.nombreEntidad || entidadData.nombreFantasia });

    // 3. Llamar a Meta Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${wsConfig.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${wsConfig.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: telefono,
          type: "text",
          text: { body: mensaje },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || `Meta API error ${response.status}`);
    }

    const messageId = result.messages?.[0]?.id;

    // 4. Log del envío en Firestore
    await addDoc(collection(db, "logs_whatsapp"), {
      entidadId,
      operacionId: operacionId || null,
      evento,
      telefono,
      messageId,
      estado: "ENVIADO",
      fecha: serverTimestamp(),
    });

    return { success: true, messageId };

  } catch (error: any) {
    console.error(`[WhatsApp] Error enviando ${evento}:`, error.message);

    // Log del error
    try {
      await addDoc(collection(db, "logs_whatsapp"), {
        entidadId,
        operacionId: operacionId || null,
        evento,
        telefono,
        estado: "ERROR",
        error: error.message,
        fecha: serverTimestamp(),
      });
    } catch (_) {}

    return { success: false, error: error.message };
  }
}
