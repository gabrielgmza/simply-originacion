// app/api/liquidacion/masiva/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, doc, getDoc, getDocs,
  updateDoc, addDoc, serverTimestamp, query, where
} from "firebase/firestore";

// ── POST: validar + ejecutar lote ────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const {
      entidadId, operacionIds, usuarioEmail,
      accion,           // "VALIDAR" | "EJECUTAR"
      numerosTransf,    // Record<opId, string> — solo en EJECUTAR
      pinConfirmacion,  // string — solo en EJECUTAR si requiere PIN
    } = await request.json();

    if (!entidadId || !operacionIds?.length)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    // Cargar config de la entidad
    const entSnap = await getDoc(doc(db, "entidades", entidadId));
    const ent      = entSnap.data() as any;
    const cfg      = ent?.configuracion?.liquidacionMasiva || {};
    const wsConf   = ent?.configuracion?.whatsapp           || {};

    // Validar PIN si está activo
    if (accion === "EJECUTAR" && cfg.requierePin && cfg.pin) {
      if (pinConfirmacion !== cfg.pin)
        return NextResponse.json({ error: "PIN incorrecto" }, { status: 403 });
    }

    // Cargar operaciones
    const ops = await Promise.all(
      operacionIds.map((id: string) =>
        getDoc(doc(db, "operaciones", id)).then(s => s.exists() ? { id: s.id, ...s.data() as any } : null)
      )
    );
    const validas = ops.filter(Boolean) as any[];

    // ── VALIDAR ────────────────────────────────────────────────────────────────
    const resultadosValidacion = validas.map(op => {
      const errores: string[] = [];
      if (cfg.validarCbu     && !op.cliente?.cbu)             errores.push("Sin CBU");
      if (cfg.validarFirma   && !op.legajo?.firmaUrl)         errores.push("Sin firma");
      if (cfg.validarLegajo  && !op.legajo?.dniFrenteUrl)     errores.push("Sin DNI frente");
      if (op.estado !== "APROBADO")                            errores.push(`Estado: ${op.estado}`);
      return {
        id:      op.id,
        nombre:  op.cliente?.nombre,
        dni:     op.cliente?.dni,
        cbu:     op.cliente?.cbu || "",
        monto:   op.financiero?.montoSolicitado || 0,
        cuotas:  op.financiero?.cuotas || 0,
        telefono:op.cliente?.telefono || "",
        errores,
        valida:  errores.length === 0,
      };
    });

    if (accion === "VALIDAR")
      return NextResponse.json({ success: true, validaciones: resultadosValidacion });

    // ── EJECUTAR ───────────────────────────────────────────────────────────────
    const soloValidas = resultadosValidacion.filter(r => r.valida);
    if (soloValidas.length === 0)
      return NextResponse.json({ error: "Ninguna operación válida para liquidar" }, { status: 400 });

    // Crear lote en Firestore
    const loteRef = await addDoc(collection(db, "lotes_liquidacion"), {
      entidadId,
      usuarioEmail,
      operacionIds:   soloValidas.map(r => r.id),
      cantidadOps:    soloValidas.length,
      montoTotal:     soloValidas.reduce((a, r) => a + r.monto, 0),
      estado:         "PROCESANDO",
      fechaCreacion:  serverTimestamp(),
    });

    const resultados: { id: string; ok: boolean; error?: string }[] = [];

    for (const r of soloValidas) {
      try {
        const nroTransf = numerosTransf?.[r.id] || "";

        // Actualizar operación
        await updateDoc(doc(db, "operaciones", r.id), {
          estado:             "LIQUIDADO",
          fechaLiquidacion:   serverTimestamp(),
          "liquidacion.loteId":       loteRef.id,
          "liquidacion.nroTransferencia": nroTransf,
          "liquidacion.liquidadoPor": usuarioEmail,
          fechaActualizacion: serverTimestamp(),
        });

        // WhatsApp al cliente
        if (cfg.whatsappAuto && wsConf.activo && wsConf.accessToken && wsConf.phoneNumberId && r.telefono) {
          const msg = `✅ *Crédito liquidado*\n\nHola ${r.nombre?.split(" ")[0]}! Tu crédito por *$${r.monto.toLocaleString("es-AR")}* fue acreditado en tu CBU ****${r.cbu.slice(-4)}.\n\n${nroTransf ? `Transferencia N°: ${nroTransf}\n` : ""}${ent.nombreFantasia}`;
          await fetch(`https://graph.facebook.com/v18.0/${wsConf.phoneNumberId}/messages`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${wsConf.accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to:   r.telefono.replace(/\D/g, ""),
              type: "text",
              text: { body: msg },
            }),
          }).catch(e => console.error("[WS liquidación]", e));
        }

        // Auditoría individual
        await addDoc(collection(db, "auditoria"), {
          operacionId:  r.id,
          entidadId,
          accion:       "LIQUIDACION_MASIVA",
          detalles:     `Lote ${loteRef.id} — Transf: ${nroTransf || "—"}`,
          usuarioEmail: usuarioEmail || "sistema",
          fecha:        serverTimestamp(),
        });

        resultados.push({ id: r.id, ok: true });
      } catch (e: any) {
        resultados.push({ id: r.id, ok: false, error: e.message });
      }
    }

    // Actualizar estado del lote
    const fallidas = resultados.filter(r => !r.ok).length;
    await updateDoc(loteRef, {
      estado:        fallidas === 0 ? "COMPLETADO" : "CON_ERRORES",
      resultados,
      fechaFin:      serverTimestamp(),
    });

    return NextResponse.json({
      success:  true,
      loteId:   loteRef.id,
      total:    soloValidas.length,
      exitosas: resultados.filter(r => r.ok).length,
      fallidas,
      resultados,
    });

  } catch (error: any) {
    console.error("[Liquidación masiva]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── GET: historial de lotes ───────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entidadId = searchParams.get("entidadId");
    if (!entidadId) return NextResponse.json({ error: "Falta entidadId" }, { status: 400 });

    const snap = await getDocs(
      query(
        collection(db, "lotes_liquidacion"),
        where("entidadId", "==", entidadId)
      )
    );

    const lotes = snap.docs
      .map(d => ({
        id:           d.id,
        cantidadOps:  d.data().cantidadOps,
        montoTotal:   d.data().montoTotal,
        estado:       d.data().estado,
        usuarioEmail: d.data().usuarioEmail,
        fechaCreacion:d.data().fechaCreacion?.toDate?.()?.toISOString() || null,
      }))
      .sort((a, b) => (b.fechaCreacion || "").localeCompare(a.fechaCreacion || ""));

    return NextResponse.json({ success: true, lotes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
