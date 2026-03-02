import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type TipoEvento =
  | "LEGAJO_CREADO"
  | "CONSULTA_BCRA"
  | "CONSULTA_JUICIOS"
  | "ESTADO_PENDIENTE_APROBACION"
  | "ESTADO_APROBADO"
  | "ESTADO_RECHAZADO"
  | "ESTADO_CORRECCIONES"
  | "ESTADO_LIQUIDADO"
  | "ESTADO_EN_MORA"
  | "ESTADO_FINALIZADO"
  | "PAGO_REGISTRADO"
  | "CAD_GENERADO"
  | "COMPROBANTE_SUBIDO"
  | "ONBOARDING_COMPLETADO"
  | "LINK_GENERADO"
  | "LINK_REGENERADO"
  | "DOCUMENTO_VISTO"
  | "LEGAJO_VISTO"
  | "PAGOS360_SYNC"
  | "REGENERACION_LINK";

export const EVENTO_LABELS: Record<TipoEvento | string, string> = {
  LEGAJO_CREADO:              "Legajo creado",
  CONSULTA_BCRA:              "Consulta BCRA realizada",
  CONSULTA_JUICIOS:           "Consulta de juicios realizada",
  ESTADO_PENDIENTE_APROBACION:"Enviado a aprobación",
  ESTADO_APROBADO:            "Operación aprobada",
  ESTADO_RECHAZADO:           "Operación rechazada",
  ESTADO_CORRECCIONES:        "Correcciones solicitadas",
  ESTADO_LIQUIDADO:           "Crédito liquidado",
  ESTADO_EN_MORA:             "Pasado a mora",
  ESTADO_FINALIZADO:          "Operación finalizada",
  PAGO_REGISTRADO:            "Pago registrado",
  CAD_GENERADO:               "CAD generado",
  COMPROBANTE_SUBIDO:         "Comprobante de transferencia subido",
  ONBOARDING_COMPLETADO:      "Onboarding completado por el cliente",
  LINK_GENERADO:              "Link de onboarding generado",
  LINK_REGENERADO:            "Link de onboarding regenerado",
  DOCUMENTO_VISTO:            "Documento consultado",
  LEGAJO_VISTO:               "Legajo visto",
  PAGOS360_SYNC:              "Sincronizado con Pagos360",
  REGENERACION_LINK:          "Link rotado y anteriores anulados",
};

export const EVENTO_COLORS: Record<TipoEvento | string, string> = {
  LEGAJO_CREADO:              "#3b82f6",
  CONSULTA_BCRA:              "#8b5cf6",
  CONSULTA_JUICIOS:           "#8b5cf6",
  ESTADO_PENDIENTE_APROBACION:"#f59e0b",
  ESTADO_APROBADO:            "#22c55e",
  ESTADO_RECHAZADO:           "#ef4444",
  ESTADO_CORRECCIONES:        "#f97316",
  ESTADO_LIQUIDADO:           "#22c55e",
  ESTADO_EN_MORA:             "#ef4444",
  ESTADO_FINALIZADO:          "#6b7280",
  PAGO_REGISTRADO:            "#22c55e",
  CAD_GENERADO:               "#3b82f6",
  COMPROBANTE_SUBIDO:         "#3b82f6",
  ONBOARDING_COMPLETADO:      "#22c55e",
  LINK_GENERADO:              "#6366f1",
  LINK_REGENERADO:            "#f97316",
  DOCUMENTO_VISTO:            "#6b7280",
  LEGAJO_VISTO:               "#6b7280",
};

interface RegistrarEventoParams {
  operacionId: string;
  entidadId: string;
  usuarioEmail: string;
  usuarioNombre?: string;
  accion: TipoEvento | string;
  detalles?: string;
}

/**
 * Registra un evento en logs_operaciones.
 * Llamar desde cualquier parte del sistema al producirse un evento auditable.
 */
export async function registrarEvento(params: RegistrarEventoParams): Promise<void> {
  try {
    await addDoc(collection(db, "logs_operaciones"), {
      operacionId: params.operacionId,
      entidadId: params.entidadId,
      usuario: params.usuarioEmail,
      usuarioNombre: params.usuarioNombre || params.usuarioEmail,
      accion: params.accion,
      detalles: params.detalles || "",
      fecha: serverTimestamp(),
    });
  } catch (e) {
    console.error("[Auditoría] Error al registrar evento:", e);
  }
}
