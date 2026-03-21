import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('permite hasta maxHits solicitudes', () => {
    const key = 'test-' + Date.now();
    for (let i = 0; i < 5; i++) {
      const { ok } = rateLimit(key, 5, 60000);
      expect(ok).toBe(true);
    }
  });

  it('bloquea después de maxHits', () => {
    const key = 'block-' + Date.now();
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60000);
    const { ok, remaining } = rateLimit(key, 5, 60000);
    expect(ok).toBe(false);
    expect(remaining).toBe(0);
  });

  it('retorna remaining correcto', () => {
    const key = 'remain-' + Date.now();
    const r1 = rateLimit(key, 3, 60000);
    expect(r1.remaining).toBe(2);
    const r2 = rateLimit(key, 3, 60000);
    expect(r2.remaining).toBe(1);
    const r3 = rateLimit(key, 3, 60000);
    expect(r3.remaining).toBe(0);
  });

  it('resetea después de windowMs', async () => {
    const key = 'reset-' + Date.now();
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 100); // window de 100ms
    const { ok: blocked } = rateLimit(key, 3, 100);
    expect(blocked).toBe(false);
    
    await new Promise(r => setTimeout(r, 150));
    const { ok: allowed } = rateLimit(key, 3, 100);
    expect(allowed).toBe(true);
  });

  it('keys diferentes son independientes', () => {
    const k1 = 'ind-a-' + Date.now();
    const k2 = 'ind-b-' + Date.now();
    for (let i = 0; i < 5; i++) rateLimit(k1, 5, 60000);
    const { ok } = rateLimit(k2, 5, 60000);
    expect(ok).toBe(true);
  });
});
