import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { setSessionCookie } from "@/lib/auth/session";

const DESTINOS: Record<string, string> = {
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
    if (!uid) return NextResponse.json({ error: "Falta uid" }, { status: 400 });

    const snap = await adminDb.collection("usuarios").doc(uid).get();
    if (!snap.exists)
      return NextResponse.json({ error: "Usuario sin perfil asignado." }, { status: 403 });

    const userData = snap.data()!;
    if (!userData.activo)
      return NextResponse.json({ error: "Tu cuenta esta inactiva." }, { status: 403 });

    const payload = {
      uid,
      rol:       userData.rol       || "VENDEDOR",
      entidadId: userData.entidadId || "",
      nombre:    userData.nombre    || "",
    };

    const destino = DESTINOS[payload.rol] || "/dashboard";
    const response = NextResponse.json({ ok: true, destino });
    return setSessionCookie(response, payload);

  } catch (error: any) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
