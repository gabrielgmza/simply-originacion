import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { crearNotificacion } from "@/lib/notificaciones/internas";
import { enviarWhatsApp } from "@/lib/notificaciones/whatsapp";
import { registrarEvento } from "@/lib/auditoria/logger";

// POST /api/onboarding/completar
// Llamado desde la página de onboarding del cliente al finalizar firma/documentos
export async function POST(request: Request) {
  try {
    const { token, operacionId, entidadId, cbu, firmaUrl } = await request.json();

    if (!operacionId || !entidadId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // 1. Marcar magic link como usado
    if (token) {
      await updateDoc(doc(db, "magic_links", token), {
        usado: true,
        fechaUso: serverTimestamp(),
      });
    }

    // 2. Actualizar operación con CBU y estado
    const updates: any = {
      "onboarding.completado": true,
      "onboarding.fechaCompletado": serverTimestamp(),
      estadoAprobacion: "PENDIENTE_APROBACION",
    };
    if (cbu) updates["onboarding.cbu"] = cbu;
    if (firmaUrl) updates["legajo.firmaUrl"] = firmaUrl;

    await updateDoc(doc(db, "operaciones", operacionId), updates);

    // 3. Cargar datos de la operación para las notificaciones
    const opSnap = await getDoc(doc(db, "operaciones", operacionId));
    const op = opSnap.data();

    // 4. Notificación interna al equipo
    await crearNotificacion({
      entidadId,
      tipo: "ONBOARDING_COMPLETADO",
      titulo: "Cliente completó su documentación",
      descripcion: `${op?.cliente?.nombre || "Cliente"} — listo para revisar`,
      operacionId,
      linkDestino: "/dashboard/aprobacion",
    });

    // 5. Notificación interna: pendiente de aprobación
    await crearNotificacion({
      entidadId,
      tipo: "PENDIENTE_APROBACION",
      titulo: "Nueva operación para aprobar",
      descripcion: `${op?.cliente?.nombre || "Cliente"} — $${(op?.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}`,
      operacionId,
      linkDestino: "/dashboard/aprobacion",
    });

    // 6. Auditoría
    await registrarEvento({
      operacionId,
      entidadId,
      usuarioEmail: "CLIENTE",
      usuarioNombre: op?.cliente?.nombre || "Cliente",
      accion: "ONBOARDING_COMPLETADO",
      detalles: cbu ? `CBU registrado: ****${cbu.slice(-4)}` : "Firma digital completada",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Onboarding completar]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
