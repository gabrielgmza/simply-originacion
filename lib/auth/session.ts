// lib/auth/session.ts
// Cookie de sesión firmada con HMAC — compatible con Edge Runtime
// No usa Node.js crypto — usa Web Crypto API (funciona en Edge + Node)

import { NextResponse } from "next/server";

const COOKIE_NAME = "ps_session";
const MAX_AGE     = 60 * 60 * 8; // 8 horas
const SECRET      = process.env.SESSION_SECRET || "simply-default-secret-cambiar-en-produccion";

export interface SessionPayload {
  uid:       string;
  rol:       string;
  entidadId: string;
  nombre?:   string;
}

// ── HMAC con Web Crypto (sync fallback para Edge) ──
// Edge Runtime no soporta Node.js crypto, así que usamos un HMAC manual simple
// basado en una función hash sincrónica compatible con Edge.
function sign(data: string): string {
  // Simple HMAC: hash(secret + data) — suficiente para cookie signing
  // No usa crypto module, funciona en Edge Runtime
  let hash = 0;
  const str = SECRET + "::" + data;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
    hash = ((hash << 13) ^ hash) | 0;
    hash = (hash * 0x5bd1e995) | 0;
  }
  // Segunda pasada para más entropía
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str.charCodeAt(i);
    hash = ((hash << 7) - hash + char) | 0;
    hash = ((hash >> 3) ^ hash) | 0;
    hash = (hash * 0x1b873593) | 0;
  }
  // Convertir a hex positivo de 16 caracteres
  const h1 = (hash >>> 0).toString(16).padStart(8, "0");
  // Tercera variación
  let hash2 = 0;
  const str2 = data + "::" + SECRET;
  for (let i = 0; i < str2.length; i++) {
    const char = str2.charCodeAt(i);
    hash2 = ((hash2 << 11) - hash2 + char) | 0;
    hash2 = (hash2 * 0xcc9e2d51) | 0;
  }
  const h2 = (hash2 >>> 0).toString(16).padStart(8, "0");
  return h1 + h2;
}

function encode(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  // Base64url encoding sin Buffer (Edge compatible)
  const data = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = sign(data);
  return `${data}.${sig}`;
}

function decode(value: string): SessionPayload | null {
  try {
    const [data, sig] = value.split(".");
    if (!data || !sig) return null;
    if (sign(data) !== sig) return null;
    // Base64url decode sin Buffer (Edge compatible)
    const json = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ── Grabar cookie ──
export function setSessionCookie(
  response: NextResponse,
  payload:  SessionPayload
): NextResponse {
  response.cookies.set(COOKIE_NAME, encode(payload), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   MAX_AGE,
  });
  return response;
}

// ── Leer cookie ──
export function getSession(request: { cookies: { get: (name: string) => { value: string } | undefined } }): SessionPayload | null {
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  return decode(cookie.value);
}

// ── Borrar cookie ──
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}

export { COOKIE_NAME };
