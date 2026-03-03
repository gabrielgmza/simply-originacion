// app/api/entidades/setup/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps } from "firebase/app";
import { getAuth as getClientAuth, createUserWithEmailAndPassword, signOut as fbSignOut } from "firebase/auth";

function getSecondaryAuth() {
  const cfg = {
    apiKey:     process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };
  const existing = getApps().find(a => a.name === "SecondaryApp");
  const app = existing || initializeApp(cfg, "SecondaryApp");
  return getClientAuth(app);
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accion = searchParams.get("accion") || "CREAR";
    const body   = await request.json();

    // ── CREAR ────────────────────────────────────────────────────────────────
    if (accion === "CREAR") {
      const { razonSocial, nombreFantasia, cuit, emailContacto, telefonoContacto } = body;

      const entidadRef = await adminDb.collection("entidades").add({
        razonSocial,
        nombreFantasia,
        cuit,
        contacto: { email: emailContacto, telefono: telefonoContacto },
        modulosHabilitados: {
          cuad:         !!body.cuad,
          adelantos:    !!body.adelantos,
          privados:     !!body.privados,
          fondeadores:  !!body.fondeadores,
          renovaciones: !!body.renovaciones,
          pagos360:     !!body.pagos360,
          email:        !!body.email,
        },
        configuracion: {
          colorPrimario:      "#FF5E14",
          tasaInteresBase:    0,
          gastosOtorgamiento: 0,
          seguroVidaPorc:     0,
          tasaMoratoria:      0.12,
        },
        setupCompletado: false,
        setupPaso:       0,
        fechaCreacion:   FieldValue.serverTimestamp(),
        creadoPor:       body.usuarioEmail || "MASTER_PAYSUR",
      });

      return NextResponse.json({ success: true, entidadId: entidadRef.id });
    }

    // ── SETUP ────────────────────────────────────────────────────────────────
    if (accion === "SETUP") {
      const { entidadId, paso, datos } = body;
      if (!entidadId) return NextResponse.json({ error: "Falta entidadId" }, { status: 400 });

      const camposPorPaso: Record<number, Record<string, any>> = {
        1: {
          "configuracion.tasaInteresBase":    datos.tasaInteresBase,
          "configuracion.gastosOtorgamiento": datos.gastosOtorgamiento,
          "configuracion.seguroVidaPorc":     datos.seguroVidaPorc,
          "configuracion.tasaMoratoria":      datos.tasaMoratoria,
          "configuracion.tasaPunitoria":      datos.tasaPunitoria,
        },
        2: {
          "configuracion.whatsapp.activo":        datos.activo,
          "configuracion.whatsapp.accessToken":   datos.accessToken,
          "configuracion.whatsapp.phoneNumberId": datos.phoneNumberId,
          "configuracion.whatsapp.wabaId":        datos.wabaId,
        },
        3: {
          "configuracion.cuad.usuario":  datos.usuario,
          "configuracion.cuad.password": datos.password,
        },
        4: {
          "configuracion.pagos360.apiKey":        datos.apiKey,
          "configuracion.pagos360.maxReintentos": datos.maxReintentos || 2,
          "configuracion.pagos360.diasReintento": datos.diasReintento || 5,
        },
        5: {
          "configuracion.liquidacionMasiva.requierePin":          datos.requierePin,
          "configuracion.liquidacionMasiva.pin":                  datos.pin,
          "configuracion.liquidacionMasiva.validarCbu":           datos.validarCbu ?? true,
          "configuracion.liquidacionMasiva.validarFirma":         datos.validarFirma ?? true,
          "configuracion.liquidacionMasiva.whatsappAuto":         datos.whatsappAuto ?? true,
          "configuracion.liquidacionMasiva.exportarExcel":        datos.exportarExcel ?? true,
          "configuracion.liquidacionMasiva.registrarTransferencia": datos.registrarTransferencia ?? true,
        },
      };

      const updates: Record<string, any> = {
        setupPaso:          paso,
        fechaActualizacion: FieldValue.serverTimestamp(),
        ...(camposPorPaso[paso] || {}),
      };
      if (paso >= 6) updates.setupCompletado = true;

      await adminDb.collection("entidades").doc(entidadId).update(updates);
      return NextResponse.json({ success: true, paso });
    }

    // ── GERENTE ──────────────────────────────────────────────────────────────
    if (accion === "GERENTE") {
      const { entidadId, nombre, email, password } = body;
      if (!entidadId || !email || !password)
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);

      await adminDb.collection("usuarios").doc(cred.user.uid).set({
        uid:          cred.user.uid,
        email,
        nombre,
        rol:          "GERENTE_GENERAL",
        entidadId,
        activo:       true,
        fechaCreacion: FieldValue.serverTimestamp(),
      });

      await fbSignOut(secondaryAuth);

      await adminDb.collection("entidades").doc(entidadId).update({
        gerenteUid:         cred.user.uid,
        gerenteEmail:       email,
        fechaActualizacion: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, uid: cred.user.uid });
    }

    return NextResponse.json({ error: "Accion no reconocida" }, { status: 400 });

  } catch (error: any) {
    console.error("[Setup entidad]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
