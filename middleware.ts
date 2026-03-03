// middleware.ts  (raíz del proyecto)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";

// ── Mapa de permisos por ruta ────────────────────────────────────────────────
// null  = cualquier rol autenticado puede acceder
// [...] = solo esos roles

const RUTAS_PROTEGIDAS: Record<string, string[] | null> = {
  // Super Admin — solo Paysur
  "/admin":                              ["MASTER_PAYSUR"],

  // Portal de fondeador — solo FONDEADOR
  "/fondeador":                          ["FONDEADOR"],

  // Configuración — solo gerentes
  "/dashboard/configuracion":            ["GERENTE_GENERAL", "MASTER_PAYSUR"],
  "/dashboard/entidades":                ["MASTER_PAYSUR"],
  "/dashboard/credenciales":             ["GERENTE_GENERAL", "MASTER_PAYSUR"],

  // Liquidación — gerente o liquidador
  "/dashboard/liquidacion":              ["GERENTE_GENERAL", "LIQUIDADOR", "MASTER_PAYSUR"],
  "/dashboard/pagos360":                 ["GERENTE_GENERAL", "LIQUIDADOR", "MASTER_PAYSUR"],

  // Aprobación y operaciones — todos menos vendedor puro
  "/dashboard/operaciones":              ["GERENTE_GENERAL", "GERENTE_SUCURSAL", "LIQUIDADOR", "MASTER_PAYSUR"],

  // Cobranzas
  "/dashboard/cobranzas":                ["GERENTE_GENERAL", "GERENTE_SUCURSAL", "COBRANZAS", "MASTER_PAYSUR"],

  // Reportes — gerentes y liquidador
  "/dashboard/reportes":                 ["GERENTE_GENERAL", "GERENTE_SUCURSAL", "LIQUIDADOR", "MASTER_PAYSUR"],

  // Sucursales
  "/dashboard/sucursales":               ["GERENTE_GENERAL", "MASTER_PAYSUR"],

  // Fondeadores config
  "/dashboard/configuracion/fondeadores":["GERENTE_GENERAL", "MASTER_PAYSUR"],

  // Originación — vendedores y gerentes
  "/dashboard/originacion":              null,  // cualquier rol autenticado
  "/dashboard/originador":               null,

  // Dashboard general
  "/dashboard":                          null,
};

// ── Rutas completamente públicas (no requieren sesión) ───────────────────────
const RUTAS_PUBLICAS = [
  "/login",
  "/onboarding",    // el cliente completa su onboarding
  "/firma",         // firma digital pública
  "/portal",        // portal público del cliente
  "/api/webhooks",  // webhooks externos (P360, etc.)
  "/api/cron",      // crons de Vercel
  "/_next",
  "/favicon",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Siempre permitir rutas públicas
  if (RUTAS_PUBLICAS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 2. Leer sesión desde cookie
  const session = getSession(request);

  // 3. Sin sesión → redirigir a /login (excepto si ya estamos ahí)
  if (!session) {
    if (pathname === "/login") return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Con sesión en /login → redirigir a destino por rol
  if (pathname === "/login") {
    const destinos: Record<string, string> = {
      MASTER_PAYSUR:    "/admin",
      GERENTE_GENERAL:  "/dashboard",
      GERENTE_SUCURSAL: "/dashboard",
      VENDEDOR:         "/dashboard/originacion",
      LIQUIDADOR:       "/dashboard/operaciones",
      COBRANZAS:        "/dashboard/cobranzas/gestion",
      FONDEADOR:        "/fondeador",
    };
    return NextResponse.redirect(new URL(destinos[session.rol] || "/dashboard", request.url));
  }

  // 5. Verificar permisos por ruta
  const rutaMatch = Object.keys(RUTAS_PROTEGIDAS)
    .sort((a, b) => b.length - a.length) // más específica primero
    .find(ruta => pathname.startsWith(ruta));

  if (rutaMatch) {
    const rolesPermitidos = RUTAS_PROTEGIDAS[rutaMatch];

    if (rolesPermitidos !== null && !rolesPermitidos.includes(session.rol)) {
      // Rol sin permiso → redirigir a página de acceso denegado o dashboard
      const denegadaUrl = new URL("/acceso-denegado", request.url);
      return NextResponse.redirect(denegadaUrl);
    }
  }

  // 6. Inyectar headers útiles para API routes (evitan re-leer la cookie)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-uid",       session.uid);
  requestHeaders.set("x-user-rol",       session.rol);
  requestHeaders.set("x-user-entidad",   session.entidadId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
