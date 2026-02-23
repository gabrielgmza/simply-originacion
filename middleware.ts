import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Buscamos la cookie de autenticación que crearemos en el Login
  const authCookie = request.cookies.get('firebase-auth-token');
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  // Si el usuario no tiene cookie y trata de ir al dashboard (o sus submódulos)
  if (!authCookie && isDashboard) {
    // Lo rebotamos instantáneamente al login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si el usuario ya está logueado (tiene cookie) y trata de ir al login
  if (authCookie && isAuthPage) {
    // Lo enviamos directo al dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Si todo está en orden, permitimos que la ruta cargue normalmente
  return NextResponse.next();
}

// Configuramos en qué rutas debe ejecutarse este guardia de seguridad
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
