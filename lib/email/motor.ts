// lib/email/motor.ts
// Punto de entrada único para todos los envíos de email.
// Verifica: módulo habilitado por Paysur + evento activo en config entidad + contabiliza envío.

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection, increment, serverTimestamp } from "firebase/firestore";
import { enviarEmail, EventoEmail } from "./resend";

// API Key de Paysur como fallback (cuando la entidad no tiene la suya)
const PAYSUR_RESEND_KEY = process.env.RESEND_API_KEY || "";

export async function dispararEmail(
  entidadId: string,
  evento:    EventoEmail,
  to:        string | string[],
  datos:     Record<string, any>
): Promise<{ ok: boolean; error?: string }> {

  try {
    // 1. Cargar config de entidad
    const entSnap = await getDoc(doc(db, "entidades", entidadId));
    if (!entSnap.exists()) return { ok: false, error: "Entidad no encontrada" };
    const ent = entSnap.data() as any;

    // 2. Verificar que Paysur habilitó el módulo email para esta entidad
    if (!ent.modulosHabilitados?.email) {
      return { ok: false, error: "Módulo email no habilitado por Paysur" };
    }

    // 3. Verificar que la entidad tiene el evento activado
    const cfgEmail = ent.configuracion?.email || {};
    if (cfgEmail[evento] === false) {
      return { ok: false, error: `Evento ${evento} desactivado por la entidad` };
    }

    // 4. Elegir API Key: la de la entidad o la de Paysur como fallback
    const apiKey = cfgEmail.resendApiKey || PAYSUR_RESEND_KEY;
    if (!apiKey) return { ok: false, error: "Sin API Key de Resend configurada" };

    // 5. Enviar
    const result = await enviarEmail({
      to, evento, datos, apiKey,
      entidad: {
        nombre:         ent.nombreFantasia || ent.razonSocial,
        colorPrimario:  ent.configuracion?.colorPrimario || "#FF5E14",
        emailRemitente: cfgEmail.emailRemitente,
      },
    });

    // 6. Contabilizar envío (para facturación y métricas)
    if (result.ok) {
      await updateDoc(doc(db, "entidades", entidadId), {
        "metricas.emailsEnviados":     increment(1),
        "metricas.emailsEnviadosMes":  increment(1),
        fechaActualizacion:             serverTimestamp(),
      });

      // Log de auditoría
      await addDoc(collection(db, "logs_emails"), {
        entidadId,
        evento,
        to: Array.isArray(to) ? to : [to],
        resendId: result.id,
        fecha: serverTimestamp(),
      });
    }

    return result;

  } catch (e: any) {
    console.error(`[Email motor] ${evento}:`, e.message);
    return { ok: false, error: e.message };
  }
}
