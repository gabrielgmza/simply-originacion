// app/api/auth/login/route.ts
// El login page llama a este endpoint tras autenticar con Firebase Auth
// Recibe uid + datos del usuario y graba la cookie de sesión

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { setSessionCookie } from "@/lib/auth/session";

// Destino por rol después del login
const RUTA_POR_ROL: Record<string, string> = {
  MASTER_PAYSUR:    "/admin",
  GERENTE_GENERAL:  "/dashboard",
  GERENTE_SUCURSAL: "/dashboard",
  VENDEDOR:         "/dashboard/originacion",
  LIQUIDADOR:       "/dashboard/operaciones",
  COBRANZAS:        "/dashboard/cobranzas/gestion",
  FONDEADOR:        "/fondeador",
};

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();
    if (!uid) return NextResponse.json({ error: "UID requerido" }, { status: 400 });

    // Cargar perfil del usuario
    const userSnap = await getDoc(doc(db, "usuarios", uid));
    if (!userSnap.exists())
      return NextResponse.json({ error: "Usuario sin perfil" }, { status: 404 });

    const user = userSnap.data() as any;

    if (!user.activo)
      return NextResponse.json({ error: "Cuenta inactiva" }, { status: 403 });

    const payload = {
      uid,
      rol:       user.rol,
      entidadId: user.entidadId || "",
      nombre:    user.nombre    || "",
    };

    const destino = RUTA_POR_ROL[user.rol] || "/dashboard";
    const response = NextResponse.json({ success: true, destino, rol: user.rol });

    return setSessionCookie(response, payload);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Logout: borra la cookie y redirige a /login
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("ps_session", "", { maxAge: 0, path: "/" });
  return response;
}
