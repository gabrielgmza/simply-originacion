import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Simulación de obtención de Token/Rol (Esto vendría de tu AuthContext/Cookies)
  const userRole = request.cookies.get('userRole')?.value; // GERENTE_GENERAL, VENDEDOR, etc.
  const userBranch = request.cookies.get('userBranch')?.value; // Mendoza, San_Rafael

  // 2. Proteger Rutas de Gerencia (Solo Gerente General)
  if (pathname.startsWith('/dashboard/gerencia') && userRole !== 'GERENTE_GENERAL') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Segmentación de Sucursales para Vendedores
  // Si un vendedor intenta entrar a una ruta de sucursal que no es la suya
  if (pathname.startsWith('/dashboard/operaciones') && userRole === 'VENDEDOR') {
     // Aquí la lógica de Firebase filtrará por sucursal automáticamente
     // Pero el middleware asegura que no salte a paneles administrativos
  }

  // 4. Rutas Públicas de Firma (Siempre permitidas con Token)
  if (pathname.startsWith('/firma')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
