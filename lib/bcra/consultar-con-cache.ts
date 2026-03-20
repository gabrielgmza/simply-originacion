// lib/bcra/consultar-con-cache.ts
// Consulta BCRA con caché en Firestore
// TTL default: 24 horas (la situación BCRA se actualiza mensualmente)

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const BOT_URL = process.env.BOT_URL || "https://simply-bot-mendoza-278599265960.us-central1.run.app";
const CACHE_TTL_HORAS_DEFAULT = 24;

interface BcraResult {
  success: boolean;
  bcra?: any;
  fromCache?: boolean;
  cachedAt?: string;
  error?: string;
}

export async function consultarBcraConCache(
  documento: string,
  sexo: string,
  ttlHoras?: number
): Promise<BcraResult> {
  const ttl = ttlHoras ?? CACHE_TTL_HORAS_DEFAULT;
  const cacheKey = `bcra_${documento}`;
  const cacheRef = doc(db, "cache_bcra", cacheKey);

  // 1. Buscar en caché
  try {
    const cacheSnap = await getDoc(cacheRef);
    if (cacheSnap.exists()) {
      const cached = cacheSnap.data();
      const cachedAt = cached.timestamp?.toDate?.() || new Date(0);
      const diffHoras = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);

      if (diffHoras < ttl) {
        return {
          success: true,
          bcra: cached.bcra,
          fromCache: true,
          cachedAt: cachedAt.toISOString(),
        };
      }
    }
  } catch (e) {
    console.error("[BCRA cache] Error leyendo caché:", e);
  }

  // 2. Consultar API real
  try {
    const res = await fetch(`${BOT_URL}/api/consultar-bcra`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documento, sexo }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();

    if (data.success && !data.error) {
      // 3. Guardar en caché
      try {
        await setDoc(cacheRef, {
          documento,
          bcra: data.bcra,
          timestamp: serverTimestamp(),
        });
      } catch (e) {
        console.error("[BCRA cache] Error guardando caché:", e);
      }

      return { success: true, bcra: data.bcra, fromCache: false };
    }

    return { success: false, error: data.mensaje || "Error en consulta BCRA" };
  } catch (e: any) {
    // 4. Si la API falla, devolver caché expirado como fallback
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        const cached = cacheSnap.data();
        return {
          success: true,
          bcra: { ...cached.bcra, _cacheExpirado: true },
          fromCache: true,
          cachedAt: cached.timestamp?.toDate?.()?.toISOString(),
        };
      }
    } catch (_) {}

    return { success: false, error: e.message || "BCRA no disponible" };
  }
}
