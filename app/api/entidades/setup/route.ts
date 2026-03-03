// app/api/entidades/setup/route.ts
// POST /api/entidades/setup?accion=CREAR    → MASTER_PAYSUR crea la entidad con módulos habilitados
// POST /api/entidades/setup?accion=SETUP    → La entidad completa su configuración
// POST /api/entidades/setup?accion=GERENTE  → Crea el primer GERENTE_GENERAL

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc, addDoc, updateDoc, setDoc,
  collection, serverTimestamp, getDoc
} from "firebase/firestore";
import {
  getAuth, createUserWithEmailAndPassword,
  signOut as fbSignOut
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";

// ── App secundaria (para crear usuarios sin cerrar sesión del admin) ──────────
function getSecondaryAuth() {
  const cfg = {
    apiKey:    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };
  const existing = getApps().find(a => a.name === "SecondaryApp");
  const app = existing || initializeApp(cfg, "SecondaryApp");
  return getAuth(app);
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accion = searchParams.get("accion") || "CREAR";
    const body   = await request.json();

    // ── CREAR: MASTER_PAYSUR crea la entidad base con módulos habilitados ────
    if (accion === "CREAR") {
      const {
        razonSocial, nombreFantasia, cuit,
        emailContacto, telefonoContacto,
        // Módulos que Paysur habilita (licenciamiento)
        moduloCuad, moduloAdelantos, moduloPrivados,
        moduloFondeadores, moduloRenovaciones,
      } = body;

      const entidadRef = await addDoc(collection(db, "entidades"), {
        razonSocial,
        nombreFantasia,
        cuit,
        contacto: { email: emailContacto, telefono: telefonoContacto },
        // Módulos habilitados por Paysur (la entidad no puede cambiar esto)
        modulosHabilitados: {
          cuad:        !!moduloCuad,
          adelantos:   !!moduloAdelantos,
          privados:    !!moduloPrivados,
          fondeadores: !!moduloFondeadores,
          renovaciones:!!moduloRenovaciones,
        },
        // Config financiera vacía — la entidad la completa en el wizard
        configuracion: {
          colorPrimario:      "#FF5E14",
          tasaInteresBase:    0,
          gastosOtorgamiento: 0,
          seguroVidaPorc:     0,
          tasaMoratoria:      0.12,
        },
        setupCompletado: false,
        setupPaso:       0,
        fechaCreacion:   serverTimestamp(),
        creadoPor:       body.usuarioEmail || "MASTER_PAYSUR",
      });

      return NextResponse.json({ success: true, entidadId: entidadRef.id });
    }

    // ── SETUP: La entidad completa su configuración paso a paso ──────────────
    if (accion === "SETUP") {
      const { entidadId, paso, datos } = body;
      if (!entidadId) return NextResponse.json({ error: "Falta entidadId" }, { status: 400 });

      // Mapa de campos por paso
      const camposPorPaso: Record<number, Record<string, any>> = {
        1: { // Tasas y parámetros financieros
          "configuracion.tasaInteresBase":    datos.tasaInteresBase,
          "configuracion.gastosOtorgamiento": datos.gastosOtorgamiento,
          "configuracion.seguroVidaPorc":     datos.seguroVidaPorc,
          "configuracion.tasaMoratoria":      datos.tasaMoratoria,
          "configuracion.tasaPunitoria":      datos.tasaPunitoria,
        },
        2: { // WhatsApp
          "configuracion.whatsapp.activo":       datos.activo,
          "configuracion.whatsapp.accessToken":  datos.accessToken,
          "configuracion.whatsapp.phoneNumberId":datos.phoneNumberId,
          "configuracion.whatsapp.wabaId":       datos.wabaId,
        },
        3: { // Credenciales CUAD
          "configuracion.cuad.usuario":   datos.usuario,
          "configuracion.cuad.password":  datos.password,
        },
        4: { // Pagos 360
          "configuracion.pagos360.apiKey":       datos.apiKey,
          "configuracion.pagos360.maxReintentos":datos.maxReintentos || 2,
          "configuracion.pagos360.diasReintento":datos.diasReintento || 5,
        },
        5: { // PIN de liquidación y config extra
          "configuracion.liquidacionMasiva.requierePin": datos.requierePin,
          "configuracion.liquidacionMasiva.pin":         datos.pin,
          "configuracion.liquidacionMasiva.validarCbu":  datos.validarCbu ?? true,
          "configuracion.liquidacionMasiva.validarFirma":datos.validarFirma ?? true,
          "configuracion.liquidacionMasiva.whatsappAuto":datos.whatsappAuto ?? true,
          "configuracion.liquidacionMasiva.exportarExcel":datos.exportarExcel ?? true,
          "configuracion.liquidacionMasiva.registrarTransferencia": datos.registrarTransferencia ?? true,
        },
        6: { // Sucursales — se manejan aparte en /api/sucursales
        },
      };

      const updates: Record<string, any> = {
        setupPaso:          paso,
        fechaActualizacion: serverTimestamp(),
        ...(camposPorPaso[paso] || {}),
      };

      // Paso final: marcar setup completado
      if (paso >= 6) updates.setupCompletado = true;

      await updateDoc(doc(db, "entidades", entidadId), updates);

      return NextResponse.json({ success: true, paso });
    }

    // ── GERENTE: Crear primer GERENTE_GENERAL de la entidad ─────────────────
    if (accion === "GERENTE") {
      const { entidadId, nombre, email, password } = body;
      if (!entidadId || !email || !password)
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);

      await setDoc(doc(db, "usuarios", cred.user.uid), {
        uid:       cred.user.uid,
        email,
        nombre,
        rol:       "GERENTE_GENERAL",
        entidadId,
        activo:    true,
        fechaCreacion: serverTimestamp(),
      });

      await fbSignOut(secondaryAuth);

      // Actualizar entidad con referencia al gerente
      await updateDoc(doc(db, "entidades", entidadId), {
        gerenteUid:         cred.user.uid,
        gerenteEmail:       email,
        fechaActualizacion: serverTimestamp(),
      });

      return NextResponse.json({ success: true, uid: cred.user.uid });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });

  } catch (error: any) {
    console.error("[Setup entidad]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
