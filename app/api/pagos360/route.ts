// app/api/pagos360/route.ts
// POST /api/pagos360        → adherir CBU o iniciar cobro manual
// GET  /api/pagos360        → consultar estado de adhesión/cobro

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, updateDoc, addDoc,
  collection, serverTimestamp
} from "firebase/firestore";
import {
  adherirCbu, iniciarCobro,
  consultarAdhesion, consultarCobro
} from "@/lib/pagos360/cliente";

// ── POST: adherir CBU o cobrar ────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { accion, operacionId, entidadId, usuarioEmail } = await request.json();

    // Cargar operación y config de la entidad
    const [opSnap, entSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionId)),
      getDoc(doc(db, "entidades",   entidadId)),
    ]);

    if (!opSnap.exists())  return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

    const op     = opSnap.data() as any;
    const apiKey = entSnap.data()?.configuracion?.pagos360?.apiKey;
    const wsConf = entSnap.data()?.configuracion?.whatsapp;

    if (!apiKey) return NextResponse.json({ error: "API Key Pagos 360 no configurada" }, { status: 400 });

    // ── ADHERIR CBU ────────────────────────────────────────────────────────
    if (accion === "ADHERIR") {
      if (!op.cliente?.cbu)    return NextResponse.json({ error: "El cliente no tiene CBU cargado" }, { status: 400 });
      if (!op.cliente?.email)  return NextResponse.json({ error: "El cliente no tiene email cargado" }, { status: 400 });

      const res = await adherirCbu(apiKey, {
        cbu:         op.cliente.cbu,
        email:       op.cliente.email,
        nombre:      op.cliente.nombre,
        cuit:        op.cliente.cuil || op.cliente.cuit || "",
        descripcion: `Crédito ${operacionId.slice(0,8).toUpperCase()}`,
        external_id: operacionId,
      });

      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

      const adhesionUid = res.data?.uid || res.data?.id;

      await updateDoc(doc(db, "operaciones", operacionId), {
        "pagos360.adhesionUid":    adhesionUid,
        "pagos360.estadoAdhesion": "ADHERIDO",
        "pagos360.fechaAdhesion":  serverTimestamp(),
        fechaActualizacion:         serverTimestamp(),
      });

      await addDoc(collection(db, "auditoria"), {
        operacionId, entidadId,
        accion:       "P360_ADHESION",
        detalles:     `CBU adherido. Adhesion UID: ${adhesionUid}`,
        usuarioEmail: usuarioEmail || "sistema",
        fecha:        serverTimestamp(),
      });

      return NextResponse.json({ success: true, adhesionUid });
    }

    // ── COBRO MANUAL ───────────────────────────────────────────────────────
    if (accion === "COBRAR") {
      const adhesionUid = op.pagos360?.adhesionUid;
      if (!adhesionUid) return NextResponse.json({ error: "El cliente no está adherido a Pagos 360" }, { status: 400 });

      const monto = op.financiero?.valorCuota || op.financiero?.montoSolicitado;
      if (!monto)  return NextResponse.json({ error: "Monto de cuota no definido" }, { status: 400 });

      const nroCuota    = (op.pagos360?.intentosCobro || 0) + 1;
      const descripcion = `Cuota ${nroCuota} - ${op.cliente?.nombre} - Op ${operacionId.slice(0,8).toUpperCase()}`;

      const res = await iniciarCobro(apiKey, {
        adhesion_uid:      adhesionUid,
        monto,
        descripcion,
        external_id:       `${operacionId}_cuota_${nroCuota}`,
      });

      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

      const requestId = res.data?.id || res.data?.uid;

      await updateDoc(doc(db, "operaciones", operacionId), {
        "pagos360.ultimoRequestId":  requestId,
        "pagos360.ultimoEstado":     "PENDIENTE",
        "pagos360.intentosCobro":    nroCuota,
        "pagos360.fechaUltimoCobro": serverTimestamp(),
        fechaActualizacion:           serverTimestamp(),
      });

      await addDoc(collection(db, "auditoria"), {
        operacionId, entidadId,
        accion:       "P360_COBRO_INICIADO",
        detalles:     `Cuota ${nroCuota} — Request ID: ${requestId}`,
        usuarioEmail: usuarioEmail || "sistema",
        fecha:        serverTimestamp(),
      });

      return NextResponse.json({ success: true, requestId });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── GET: consultar estado ─────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const operacionId = searchParams.get("operacionId");
    const entidadId   = searchParams.get("entidadId");
    if (!operacionId || !entidadId)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    const [opSnap, entSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionId)),
      getDoc(doc(db, "entidades",   entidadId)),
    ]);

    const op     = opSnap.data() as any;
    const apiKey = entSnap.data()?.configuracion?.pagos360?.apiKey;
    if (!apiKey) return NextResponse.json({ error: "Sin API Key" }, { status: 400 });

    const adhesionUid = op?.pagos360?.adhesionUid;
    const requestId   = op?.pagos360?.ultimoRequestId;

    const [adhesion, cobro] = await Promise.all([
      adhesionUid ? consultarAdhesion(apiKey, adhesionUid) : Promise.resolve(null),
      requestId   ? consultarCobro(apiKey, requestId)      : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success:  true,
      adhesion: adhesion?.data || null,
      cobro:    cobro?.data    || null,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
