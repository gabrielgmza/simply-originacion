import { dispararNotificacionWS } from "./wsEngine";

export async function enviarNotificacionOmnicanal(cliente: any, mensaje: string, operacionId: string) {
  // 1. Intentamos Notificación Push (Costo $0)
  if (cliente.pushToken) {
    console.log("Enviando PUSH a:", cliente.primerNombre);
    // Lógica de Firebase Cloud Messaging (FCM)
    return { canal: 'PUSH', success: true };
  }

  // 2. Si no hay Push, usamos WhatsApp (Costo fijo configurado)
  const res = await dispararNotificacionWS(cliente.entidadId, operacionId, "RECORDATORIO");
  return { canal: 'WHATSAPP', ...res };
}
