import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";

const RUTAS_PROTEGIDAS: Record<string, string[] | null> = {
  "/admin":                               ["MASTER_PAYSUR"],
  "/admin/onboarding":                    ["MASTER_PAYSUR"],
  "/admin/entidades":                     ["MASTER_PAYSUR"],
  "/fondeador":                           ["FONDEADOR"],
  "/dashboard/configuracion":             ["GERENTE_GENERAL", "MASTER_PAYSUR"],
  "/dashboard/entidades":                 ["MASTER_PAYSUR"],
  "/dashboard/credenciales":              ["GERENTE_GENERAL", "MASTER_PAYSUR"],
  "/dashboard/liquidacion":               ["GERENTE_GENERAL", "LIQUIDADOR", "MASTER_PAYSUR"],
  "/dashboard/pagos360":                  ["GERENTE_GENERAL", "LIQUIDADOR", "MASTER_PAYSUR"],
  "/dashboard/operaciones":               ["GERENTE_GENERAL", "GERENTE_SUCURSAL", "LIQUIDADOR", "MASTER_PAYSUR"],
  "/dashboard/cobranzas":                 ["GERENTE_GENERAL", "GERENTE_SUCURSAL", "COBRANZAS", "MASTER_PAYSUR"],
  "/dashboard/reportes":                  ["GERENTE_GENERAL", "GERENTE_SUCURSAL", "LIQUIDADOR", "MASTER_PAYSUR"],
  "/dashboard/sucursales":                ["GERENTE_GENERAL", "MASTER_PAYSUR"],
  "/dashboard/configuracion/fondeadores": ["GERENTE_GENERAL", "MASTER_PAYSUR"],
  "/dashboard/originacion":               null,
  "/dashboard/originador":                null,
  "/dashboard":                           null,
};

const RUTAS_PUBLICAS = [
  "/login",
  "/onboarding",
  "/firma",
  "/portal",
  "/api/",
  "/_next",
  "/favicon",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RUTAS_PUBLICAS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = getSession(request);

  if (!session) {
    if (pathname === "/login") return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

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

  const rutaMatch = Object.keys(RUTAS_PROTEGIDAS)
    .sort((a, b) => b.length - a.length)
    .find(ruta => pathname.startsWith(ruta));

  if (rutaMatch) {
    const rolesPermitidos = RUTAS_PROTEGIDAS[rutaMatch];
    if (rolesPermitidos !== null && !rolesPermitidos.includes(session.rol)) {
      return NextResponse.redirect(new URL("/acceso-denegado", request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-uid",     session.uid);
  requestHeaders.set("x-user-rol",     session.rol);
  requestHeaders.set("x-user-entidad", session.entidadId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
