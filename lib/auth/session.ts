// lib/auth/session.ts
// Cookie de sesión firmada con HMAC — no se puede falsificar sin SESSION_SECRET
// Para producción: agregar SESSION_SECRET en Vercel env vars (cualquier string largo random)

import { NextResponse } from "next/server";
import { createHmac } from "crypto";

const COOKIE_NAME = "ps_session";
const MAX_AGE     = 60 * 60 * 8; // 8 horas
const SECRET      = process.env.SESSION_SECRET || "simply-default-secret-cambiar-en-produccion";

export interface SessionPayload {
  uid:       string;
  rol:       string;
  entidadId: string;
  nombre?:   string;
}

// ── Firma HMAC ──
function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

function encode(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig  = sign(data);
  return `${data}.${sig}`;
}

function decode(value: string): SessionPayload | null {
  try {
    const [data, sig] = value.split(".");
    if (!data || !sig) return null;
    // Verificar firma
    if (sign(data) !== sig) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
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
