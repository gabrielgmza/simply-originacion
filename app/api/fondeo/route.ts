// app/api/fondeo/route.ts
// POST /api/fondeo  → calcular ofertas para una operación (filtra por producto)
// PATCH /api/fondeo → asignar fondeador a operación

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, doc, getDoc, getDocs, updateDoc,
  query, where, addDoc, serverTimestamp
} from "firebase/firestore";
import { calcularOfertas } from "@/lib/fondeo/subasta-motor";
import { getSession } from "@/lib/auth/session";
import { validarAccesoEntidad } from "@/lib/auth/validate-entidad";
import { dispararEmail } from "@/lib/email/motor";

// ── POST: calcular ofertas ────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { operacionId, entidadId, producto } = await request.json();

    const session = getSession(request as any);
    const acceso = validarAccesoEntidad(session, entidadId);
    if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: 403 });

    const [opSnap, fondSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionId)),
      getDocs(query(collection(db, "fondeadores"), where("entidadId", "==", entidadId), where("activo", "==", true))),
    ]);

    if (!opSnap.exists()) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

    const op     = opSnap.data() as any;
    const monto  = op.financiero?.montoSolicitado || 0;
    const cuotas = op.financiero?.cuotas          || 12;
    const score  = op.scoring?.puntaje            || 0;
    // Producto: del body, de la operación, o default
    const tipoProducto = producto || op.tipo || "PRIVADO";

    const fondeadores = await Promise.all(fondSnap.docs.map(async d => {
      const f = { id: d.id, ...d.data() } as any;
      const cartSnap = await getDocs(
        query(collection(db, "operaciones"),
          where("fondeo.fondeadorId", "==", d.id),
          where("estado", "in", ["LIQUIDADO", "EN_MORA", "APROBADO"]))
      );
      f.cupoUsado = cartSnap.docs.reduce((a, c) => a + (c.data().financiero?.montoSolicitado || 0), 0);
      return f;
    }));

    const ofertas = calcularOfertas(monto, cuotas, score, fondeadores, tipoProducto);
    return NextResponse.json({ success: true, ofertas });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── PATCH: asignar fondeador ──────────────────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const { operacionId, fondeadorId, oferta, usuarioEmail, entidadId } = await request.json();

    const session = getSession(request as any);
    const acceso = validarAccesoEntidad(session, entidadId);
    if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: 403 });

    const fondSnap = await getDoc(doc(db, "fondeadores", fondeadorId));
    const fond     = fondSnap.data() as any;

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

    await addDoc(collection(db, "auditoria"), {
      operacionId, entidadId,
      accion:       "FONDEO_ASIGNADO",
      detalles:     `Fondeador: ${oferta.nombre} — TNA ${oferta.tna}% — Cuota $${oferta.cuotaFinal}`,
      usuarioEmail: usuarioEmail || "sistema",
      fecha:        serverTimestamp(),
    });

    if (fond?.emailNotificacion) {
      dispararEmail(entidadId, "FONDEO_ASIGNADO" as any, fond.emailNotificacion, {
        fondeadorNombre: fond.nombre,
        operacionId,
        monto: oferta.monto || 0,
        cuotas: oferta.cuotas || 0,
        cuotaFinal: oferta.cuotaFinal,
        tna: oferta.tna,
      }).catch(e => console.error("[Email fondeo]", e));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
