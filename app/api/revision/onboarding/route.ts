// app/api/revision/onboarding/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  validarLocal, validarConVision, calcularDecision,
  REGLAS_DEFAULT, type ReglasRevision
} from "@/lib/revision/motor-fraude";

export async function POST(request: Request) {
  try {
    const { operacionId, entidadId, usuarioEmail, soloLocal } = await request.json();
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

    // ── 2. Config de la entidad ──────────────────────────────────────────────
    const reglas: Partial<ReglasRevision> = ent?.configuracion?.revisionOnboarding || {};
    const visionApiKey: string = ent?.configuracion?.googleVisionApiKey || "";
    const visionActivo = !soloLocal && reglas.visionActivo && !!visionApiKey;

    // Inyectar config de campos extra para validación
    op._camposExtraConfig = ent?.configuracion?.camposExtraOnboarding || [];

    // ── 3. Validaciones locales ──────────────────────────────────────────────
    let todosChecks = validarLocal(op, reglas);
    let ocrDatos: any = undefined;

    // ── 4. Vision API (si está activa) ───────────────────────────────────────
    if (visionActivo) {
      try {
        const visionResult = await validarConVision(op, visionApiKey, reglas);
        todosChecks = [...todosChecks, ...visionResult.checks];
        ocrDatos    = visionResult.ocrDatos;
      } catch (e) {
        console.error("[Vision API]", e);
        // No interrumpir si Vision falla — continúa con local
      }
    }

    // ── 5. Calcular decisión ─────────────────────────────────────────────────
    const resultado = calcularDecision(todosChecks, reglas);
    if (ocrDatos) (resultado as any).ocrDatos = ocrDatos;

    // ── 6. Guardar resultado en la operación ─────────────────────────────────
    const nuevoEstado =
      resultado.decision === "APROBADO_AUTO"  ? "APROBADO"    :
      resultado.decision === "RECHAZADO_AUTO" ? "RECHAZADO"   :
      "EN_REVISION"; // mantiene para revisión manual

    await updateDoc(doc(db, "operaciones", operacionId), {
      "revision.scoreValidacion": resultado.scoreValidacion,
      "revision.decision":        resultado.decision,
      "revision.resumen":         resultado.resumen,
      "revision.checks":          resultado.checks,
      "revision.ocrDatos":        ocrDatos || null,
      "revision.usóVision":       visionActivo,
      "revision.fecha":           serverTimestamp(),
      "revision.revisadoPor":     usuarioEmail || "sistema",
      ...(resultado.decision !== "REVISION_MANUAL" ? { estado: nuevoEstado } : {}),
      fechaActualizacion: serverTimestamp(),
    });

    // ── 7. Auditoría ─────────────────────────────────────────────────────────
    await addDoc(collection(db, "auditoria"), {
      operacionId,
      entidadId,
      accion:      "REVISION_ONBOARDING",
      detalles:    `Score: ${resultado.scoreValidacion}/100 — ${resultado.decision}${visionActivo ? " [Vision]" : " [local]"}`,
      usuarioEmail: usuarioEmail || "sistema",
      fecha:        serverTimestamp(),
    });

    return NextResponse.json({ success: true, resultado, visionUsado: visionActivo });

  } catch (error: any) {
    console.error("[Revisión Onboarding]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── PATCH: decisión manual del operador ──────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const { operacionId, entidadId, accion, motivo, usuarioEmail, telefonoCliente, nombreCliente, entidadNombre, wsActivo, wsAccessToken, wsPhoneId } = await request.json();
    // accion: "APROBAR" | "RECHAZAR" | "PEDIR_CORRECCION"

    if (!operacionId || !accion)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    const nuevoEstado =
      accion === "APROBAR"           ? "APROBADO"          :
      accion === "RECHAZAR"          ? "RECHAZADO"         :
      accion === "PEDIR_CORRECCION"  ? "PENDIENTE_DOCS"    : null;

    if (!nuevoEstado)
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });

    await updateDoc(doc(db, "operaciones", operacionId), {
      estado:                    nuevoEstado,
      "revision.decisionManual": accion,
      "revision.motivoManual":   motivo || "",
      "revision.operadorEmail":  usuarioEmail,
      "revision.fechaManual":    serverTimestamp(),
      fechaActualizacion:        serverTimestamp(),
    });

    // ── WhatsApp al cliente ──────────────────────────────────────────────────
    if (wsActivo && wsAccessToken && wsPhoneId && telefonoCliente) {
      const mensajes: Record<string, string> = {
        APROBAR:          `✅ ¡Buenas noticias, ${nombreCliente}! Tu documentación fue *aprobada* por ${entidadNombre}. Nos pondremos en contacto pronto para los próximos pasos.`,
        RECHAZAR:         `Hola ${nombreCliente}, lamentablemente tu documentación no pudo ser aprobada por ${entidadNombre}. Motivo: ${motivo || "No cumple los requisitos"}. Podés comunicarte con tu asesor para más información.`,
        PEDIR_CORRECCION: `Hola ${nombreCliente}, necesitamos que corrijas o vuelvas a enviar tu documentación para ${entidadNombre}. Motivo: ${motivo || "Documentación incompleta o ilegible"}. Tu asesor te enviará un nuevo enlace.`,
      };

      try {
        await fetch(`https://graph.facebook.com/v18.0/${wsPhoneId}/messages`, {
          method:  "POST",
          headers: {
            "Authorization": `Bearer ${wsAccessToken}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to:   telefonoCliente.replace(/\D/g, ""),
            type: "text",
            text: { body: mensajes[accion] },
          }),
        });
      } catch (wsErr) {
        console.error("[WhatsApp revisión]", wsErr);
      }
    }

    // ── Auditoría ────────────────────────────────────────────────────────────
    await addDoc(collection(db, "auditoria"), {
      operacionId,
      entidadId,
      accion:      `REVISION_${accion}`,
      detalles:    motivo || accion,
      usuarioEmail: usuarioEmail || "operador",
      fecha:        serverTimestamp(),
    });

    return NextResponse.json({ success: true, nuevoEstado });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
