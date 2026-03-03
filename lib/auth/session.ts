// lib/auth/session.ts
// Graba/lee una cookie de sesión liviana con rol, entidadId y uid
// El middleware la usa para proteger rutas sin llamar a Firebase

import { NextResponse } from "next/server";

const COOKIE_NAME = "ps_session";
const MAX_AGE    = 60 * 60 * 8; // 8 horas

export interface SessionPayload {
  uid:       string;
  rol:       string;
  entidadId: string;
  nombre?:   string;
}

// ── Codificación simple Base64 (no requiere crypto en Edge) ──────────────────
// Para producción con datos sensibles se puede cambiar a JWT con JOSE

function encode(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decode(value: string): SessionPayload | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

// ── Grabar cookie (llamar desde el login page tras autenticar) ───────────────
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

// ── Leer cookie (usada en middleware y API routes) ───────────────────────────
export function getSession(request: { cookies: { get: (name: string) => { value: string } | undefined } }): SessionPayload | null {
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  return decode(cookie.value);
}

// ── Borrar cookie (logout) ───────────────────────────────────────────────────
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}

export { COOKIE_NAME };
