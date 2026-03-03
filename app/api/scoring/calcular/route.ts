// app/api/scoring/calcular/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, getDocs, collection, query,
  where, addDoc, updateDoc, serverTimestamp, orderBy, limit
} from "firebase/firestore";
import { calcularScoring, CONFIG_SCORING_DEFAULT } from "@/lib/scoring/motor";

export async function POST(request: Request) {
  try {
    const { operacionId, entidadId, usuarioEmail } = await request.json();
    if (!operacionId || !entidadId)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    // ── 1. Cargar operación y entidad ────────────────────────────────────────
    const [opSnap, entSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionId)),
      getDoc(doc(db, "entidades",   entidadId)),
    ]);
    if (!opSnap.exists()) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

    const op  = opSnap.data()  as any;
    const ent = entSnap.data() as any;

    // ── 2. Config de scoring de la entidad ───────────────────────────────────
    const configEntidad = ent?.configuracion?.scoring || {};
    const config = { ...CONFIG_SCORING_DEFAULT, ...configEntidad };

    // ── 3. Historial interno del cliente ────────────────────────────────────
    const dni = op.cliente?.dni;
    let opsPrevias       = 0;
    let pagosPuntuales   = 0;
    let cuotasTotales    = 0;
    let moraPrevia       = false;
    let diasMoraMaxima   = 0;

    if (dni) {
      const histSnap = await getDocs(
        query(collection(db, "operaciones"),
          where("entidadId", "==", entidadId),
          where("cliente.dni", "==", dni))
      );
      for (const d of histSnap.docs) {
        if (d.id === operacionId) continue; // excluir la actual
        opsPrevias++;
        const data = d.data() as any;
        const cuotas = data.financiero?.cuotas || 0;
        cuotasTotales += cuotas;

        // Pagos de ese crédito
        const pagosSnap = await getDocs(
          query(collection(db, "pagos"), where("operacionId", "==", d.id))
        );
        pagosPuntuales += pagosSnap.size; // simplificado: 1 pago = 1 cuota puntual

        if (data.cobranzas?.diasMora > 0) {
          moraPrevia = true;
          diasMoraMaxima = Math.max(diasMoraMaxima, data.cobranzas.diasMora);
        }
      }
    }

    // ── 4. Inputs del scoring ────────────────────────────────────────────────
    const inputs = {
      fechaNacimiento:       op.cliente?.fechaNacimiento,
      antiguedadMeses:       op.cliente?.antiguedadMeses       ?? op.cliente?.antiguedad,
      ingresoMensual:        op.cliente?.ingresoMensual        ?? op.financiero?.ingresoNeto,
      estadoCivil:           op.cliente?.estadoCivil,
      situacionBcraActual:   op.scoring?.bcra?.situacionActual ?? (op.cliente?.scoreBcra ? parseInt(op.cliente.scoreBcra) : undefined),
      peorSituacionHistorica:op.scoring?.bcra?.peorSituacion,
      opsPreviasEntidad:     opsPrevias,
      pagosPuntuales,
      cuotasTotalesPrevias:  cuotasTotales,
      moraPrevia,
      diasMoraMaxima,
    };

    // ── 5. Calcular ──────────────────────────────────────────────────────────
    const resultado = calcularScoring(inputs, config);

    // ── 6. Guardar en historial_scoring ─────────────────────────────────────
    const scoreRef = await addDoc(collection(db, "historial_scoring"), {
      operacionId,
      entidadId,
      clienteDni:   dni,
      puntaje:      resultado.puntaje,
      decision:     resultado.decision,
      breakdown:    resultado.breakdown,
      alertas:      resultado.alertas,
      inputs,
      calculadoPor: usuarioEmail || "sistema",
      fecha:        serverTimestamp(),
    });

    // ── 7. Actualizar operación con el último score ──────────────────────────
    await updateDoc(doc(db, "operaciones", operacionId), {
      "scoring.puntaje":      resultado.puntaje,
      "scoring.decision":     resultado.decision,
      "scoring.alertas":      resultado.alertas,
      "scoring.ultimoCalculo":serverTimestamp(),
      "scoring.scoreId":      scoreRef.id,
      fechaActualizacion:     serverTimestamp(),
    });

    // ── 8. Auditoría ─────────────────────────────────────────────────────────
    await addDoc(collection(db, "auditoria"), {
      operacionId,
      entidadId,
      accion:      "SCORING_CALCULADO",
      detalles:    `Puntaje: ${resultado.puntaje}/1000 — ${resultado.decision}`,
      usuarioEmail: usuarioEmail || "sistema",
      fecha:        serverTimestamp(),
    });

    return NextResponse.json({ success: true, resultado });

  } catch (error: any) {
    console.error("[Scoring]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
