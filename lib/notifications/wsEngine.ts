import { db } from "../firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";

export async function dispararNotificacionWS(entidadId: string, operacionId: string, tipo: string) {
  const entRef = doc(db, "entidades", entidadId);
  const entSnap = await getDoc(entRef);
  const config = entSnap.data()?.configuracion?.notificaciones;

  if (!config?.ws_activo) return { success: false, message: "Servicio desactivado" };

  // Lógica de auditoría de costos
  await updateDoc(entRef, {
    "metricas.notificaciones_enviadas": increment(1),
    "metricas.costo_acumulado_ws": increment(config.ws_costo_por_mensaje)
  });

  return { success: true };
}
