import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, doc, getDoc, serverTimestamp
} from "firebase/firestore";
import { registrarEvento } from "@/lib/auditoria/logger";
import { crearNotificacion } from "@/lib/notificaciones/internas";

// POST /api/operaciones/crear
// Crea una nueva operación asignando automáticamente la sucursal del vendedor
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      entidadId,
      vendedorId,
      vendedorEmail,
      tipo,
      cliente,
      financiero,
    } = body;

    if (!entidadId || !vendedorId || !cliente || !financiero) {
      return NextResponse.json({ error: "Faltan parámetros obligatorios" }, { status: 400 });
    }

    // Obtener sucursalId del vendedor
    const vendedorSnap = await getDoc(doc(db, "usuarios", vendedorId));
    const sucursalId = vendedorSnap.data()?.sucursalId || null;

    // Crear la operación con sucursalId
    const nueva = await addDoc(collection(db, "operaciones"), {
      entidadId,
      vendedorId,
      sucursalId,
      tipo:             tipo || "PRIVADO",
      estadoAprobacion: "PENDIENTE_APROBACION",
      estado:           "EN_REVISION",
      cliente,
      financiero,
      legajo:    {},
      seguridad: {},
      fechaCreacion:      serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    });

    // Auditoría
    await registrarEvento({
      operacionId:   nueva.id,
      entidadId,
      usuarioEmail:  vendedorEmail || vendedorId,
      usuarioNombre: vendedorSnap.data()?.nombre || "Vendedor",
      accion:        "LEGAJO_CREADO",
      detalles:      `${cliente.nombre} — $${(financiero.montoSolicitado || 0).toLocaleString("es-AR")}`,
    });

    // Notificación interna
    await crearNotificacion({
      entidadId,
      tipo:         "PENDIENTE_APROBACION",
      titulo:       "Nueva operación para aprobar",
      descripcion:  `${cliente.nombre} — $${(financiero.montoSolicitado || 0).toLocaleString("es-AR")}`,
      operacionId:  nueva.id,
      linkDestino:  "/dashboard/aprobacion",
    });

    return NextResponse.json({ success: true, operacionId: nueva.id, sucursalId });

  } catch (error: any) {
    console.error("[Crear operación]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
