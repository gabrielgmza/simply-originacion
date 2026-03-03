// hooks/useSetupGuard.ts
// Usar en el layout del dashboard.
// Si la entidad no completó el setup, redirige al wizard automáticamente.
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function useSetupGuard() {
  const { entidadData, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!userData || !entidadData) return;

    // Solo aplica a GERENTE_GENERAL (ellos completan el setup)
    if (userData.rol !== "GERENTE_GENERAL") return;

    const setupCompletado = (entidadData as any).setupCompletado;

    if (setupCompletado === false) {
      router.replace(`/setup/entidad?entidadId=${entidadData.id}`);
    }
  }, [loading, userData, entidadData]);
}
