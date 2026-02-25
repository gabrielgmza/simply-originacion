import { dispararNotificacionWS } from "./wsEngine";

export async function notificarEvento(tipo: 'SISTEMA' | 'CLIENTE', payload: any) {
  if (tipo === 'SISTEMA') {
    // 1. Notificación PUSH al Empleado (Costo $0)
    if (payload.empleadoPushToken) {
      console.log("Enviando PUSH interna al empleado...");
      // Aquí se dispara el envío a través de WebPush o Firebase Cloud Messaging
      return { canal: 'PUSH', target: 'INTERNO' };
    }
  } else {
    // 2. Notificación WHATSAPP al Cliente (Costo Fijo)
    return await dispararNotificacionWS(payload.entidadId, payload.operacionId, payload.mensajeTipo);
  }
}
