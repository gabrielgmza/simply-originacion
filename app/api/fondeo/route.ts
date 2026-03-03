// app/api/fondeo/route.ts
// POST /api/fondeo         → calcular ofertas para una operación
// PATCH /api/fondeo        → asignar fondeador a operación
// GET  /api/fondeo/portal  → datos del portal para el fondeador autenticado

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, doc, getDoc, getDocs, updateDoc,
  query, where, addDoc, serverTimestamp, orderBy
} from "firebase/firestore";
import { calcularOfertas, calcularContabilidad } from "@/lib/fondeo/subasta-motor";

// ── POST: calcular ofertas ────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { operacionId, entidadId } = await request.json();

    const [opSnap, fondSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionId)),
      getDocs(query(collection(db, "fondeadores"), where("entidadId", "==", entidadId), where("activo", "==", true))),
    ]);

    if (!opSnap.exists()) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

    const op         = opSnap.data() as any;
    const monto      = op.financiero?.montoSolicitado || 0;
    const cuotas     = op.financiero?.cuotas          || 12;
    const score      = op.scoring?.puntaje            || 0;

    // Cargar cupo usado por cada fondeador
    const fondeadores = await Promise.all(fondSnap.docs.map(async d => {
      const f = { id: d.id, ...d.data() } as any;
      const cartSnap = await getDocs(
        query(collection(db, "operaciones"),
          where("fondeo.fondeadorId", "==", d.id),
          where("estado", "in", ["LIQUIDADO","EN_MORA","APROBADO"]))
      );
      f.cupoUsado = cartSnap.docs.reduce((a, c) => a + (c.data().financiero?.montoSolicitado || 0), 0);
      return f;
    }));

    const ofertas = calcularOfertas(monto, cuotas, score, fondeadores);
    return NextResponse.json({ success: true, ofertas });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── PATCH: asignar fondeador ──────────────────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const { operacionId, fondeadorId, oferta, usuarioEmail, entidadId } = await request.json();

    // Cargar fondeador para email notificación
    const fondSnap = await getDoc(doc(db, "fondeadores", fondeadorId));
    const fond     = fondSnap.data() as any;

    // Actualizar operación
    await updateDoc(doc(db, "operaciones", operacionId), {
      "fondeo.fondeadorId":   fondeadorId,
      "fondeo.nombre":        oferta.nombre,
      "fondeo.tna":           oferta.tna,
      "fondeo.cuotaFinal":    oferta.cuotaFinal,
      "fondeo.comision":      oferta.comision,
      "fondeo.fechaAsig":     serverTimestamp(),
      "fondeo.asignadoPor":   usuarioEmail,
      fechaActualizacion:     serverTimestamp(),
    });

    // Auditoría
    await addDoc(collection(db, "auditoria"), {
      operacionId, entidadId,
      accion:       "FONDEO_ASIGNADO",
      detalles:     `Fondeador: ${oferta.nombre} — TNA ${oferta.tna}% — Cuota $${oferta.cuotaFinal}`,
      usuarioEmail: usuarioEmail || "sistema",
      fecha:        serverTimestamp(),
    });

    // Notificación por email al fondeador (log — integrar con SendGrid/Resend si se desea)
    if (fond?.emailNotificacion) {
      console.log(`[Fondeo] Notificar a ${fond.emailNotificacion}: nueva operación asignada ${operacionId}`);
      // await sendEmail(fond.emailNotificacion, "Nueva operación asignada", ...)
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
