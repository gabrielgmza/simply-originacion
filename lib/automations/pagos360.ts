import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export async function dispararSincronizacionAutomatica(operacionId: string, entidadId: string) {
  try {
    const response = await fetch("/api/pagos360/sincronizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operacionId, entidadId }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    return { success: true, id_externo: data.id };
  } catch (error) {
    console.error("[Auto-Sync Error]:", error);
    return { success: false, error };
  }
}
