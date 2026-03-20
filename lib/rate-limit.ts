// lib/rate-limit.ts
// Rate limiter en memoria — para producción considerar Redis

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxHits: number = 5, windowMs: number = 60000): { ok: boolean; remaining: number } {
  const now = Date.now();
  const record = hits.get(key);

  // Limpiar entradas viejas periódicamente
  if (hits.size > 10000) {
    for (const [k, v] of hits) {
      if (v.resetAt < now) hits.delete(k);
    }
  }

  if (!record || record.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxHits - 1 };
  }

  record.count++;
  if (record.count > maxHits) {
    return { ok: false, remaining: 0 };
  }

  return { ok: true, remaining: maxHits - record.count };
}
