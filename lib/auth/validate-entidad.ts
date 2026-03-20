// lib/auth/validate-entidad.ts
// Valida que el usuario de la sesión tiene permiso para operar sobre una entidad
// MASTER_PAYSUR puede acceder a cualquier entidad (impersonación)

import { SessionPayload } from "./session";

export function validarAccesoEntidad(
  session: SessionPayload | null,
  entidadId: string
): { ok: boolean; error?: string } {
  if (!session) {
    return { ok: false, error: "No autorizado" };
  }

  // MASTER_PAYSUR puede operar en cualquier entidad
  if (session.rol === "MASTER_PAYSUR") {
    return { ok: true };
  }

  // Los demás roles solo pueden operar en su propia entidad
  if (session.entidadId !== entidadId) {
    return { ok: false, error: "No tenés permiso para operar en esta entidad" };
  }

  return { ok: true };
}
