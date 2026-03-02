import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";

export type TipoNotificacion =
  | "PENDIENTE_APROBACION"
  | "LISTO_LIQUIDAR"
  | "ONBOARDING_COMPLETADO"
  | "OPERACION_RECHAZADA"
  | "CLIENTE_EN_MORA"
  | "PROMESA_VENCIDA";

export const NOTIF_CONFIG: Record<TipoNotificacion, {
  label: string;
  color: string;
  emoji: string;
  rolesDestino: string[];  // qué roles reciben esta notificación
}> = {
  PENDIENTE_APROBACION:  { label: "Nueva operación para aprobar",      color: "#8b5cf6", emoji: "📋", rolesDestino: ["GERENTE_GENERAL","GERENTE_SUCURSAL","SUPERVISOR_SUCURSAL","MASTER_PAYSUR"] },
  LISTO_LIQUIDAR:        { label: "Operación lista para liquidar",      color: "#f59e0b", emoji: "💰", rolesDestino: ["GERENTE_GENERAL","LIQUIDADOR","MASTER_PAYSUR"] },
  ONBOARDING_COMPLETADO: { label: "Cliente completó su documentación",  color: "#22c55e", emoji: "✅", rolesDestino: ["GERENTE_GENERAL","GERENTE_SUCURSAL","SUPERVISOR_SUCURSAL","VENDEDOR","MASTER_PAYSUR"] },
  OPERACION_RECHAZADA:   { label: "Operación rechazada",                color: "#ef4444", emoji: "❌", rolesDestino: ["GERENTE_GENERAL","GERENTE_SUCURSAL","VENDEDOR","MASTER_PAYSUR"] },
  CLIENTE_EN_MORA:       { label: "Cliente entró en mora",              color: "#ef4444", emoji: "⚠️", rolesDestino: ["GERENTE_GENERAL","GERENTE_SUCURSAL","LIQUIDADOR","MASTER_PAYSUR"] },
  PROMESA_VENCIDA:       { label: "Promesa de pago vencida sin cumplir",color: "#f97316", emoji: "📅", rolesDestino: ["GERENTE_GENERAL","GERENTE_SUCURSAL","MASTER_PAYSUR"] },
};

interface CrearNotifParams {
  entidadId: string;
  tipo: TipoNotificacion;
  titulo: string;
  descripcion: string;
  operacionId?: string;
  clienteNombre?: string;
  linkDestino?: string;
}

/**
 * Crea una notificación interna en Firestore.
 * Primero verifica si la entidad tiene ese tipo habilitado en su config.
 */
export async function crearNotificacion(params: CrearNotifParams): Promise<void> {
  try {
    // Verificar si la entidad tiene este tipo de notificación habilitado
    const entSnap = await getDoc(doc(db, "entidades", params.entidadId));
    const notifConfig = entSnap.data()?.configuracion?.notificacionesInternas;

    // Si hay config y el tipo está explícitamente desactivado, no crear
    if (notifConfig && notifConfig[params.tipo] === false) return;

    await addDoc(collection(db, "notificaciones"), {
      entidadId:     params.entidadId,
      tipo:          params.tipo,
      titulo:        params.titulo,
      descripcion:   params.descripcion,
      operacionId:   params.operacionId || null,
      clienteNombre: params.clienteNombre || null,
      linkDestino:   params.linkDestino || null,
      rolesDestino:  NOTIF_CONFIG[params.tipo].rolesDestino,
      leida:         false,
      fecha:         serverTimestamp(),
    });
  } catch (e) {
    console.error("[Notificaciones] Error al crear:", e);
  }
}
