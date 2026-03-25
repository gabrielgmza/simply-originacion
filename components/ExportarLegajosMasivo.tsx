"use client";
import { useState } from "react";
import { FileText, Loader2, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Props {
  operacionIds: string[];
  className?: string;
}

export default function ExportarLegajosMasivo({ operacionIds, className }: Props) {
  const { entidadData } = useAuth();
  const [descargando, setDescargando] = useState(false);
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const exportar = async () => {
    if (!entidadData?.id || operacionIds.length === 0) return;
    if (operacionIds.length > 20) {
      alert("Máximo 20 legajos por lote. Filtrá la selección.");
      return;
    }
    setDescargando(true);
    try {
      const res = await fetch("/api/legajo/masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operacionIds, entidadId: entidadData.id }),
      });
      if (!res.ok) { alert("Error al generar los legajos."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legajos-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Error al descargar."); }
    finally { setDescargando(false); }
  };

  return (
    <button onClick={exportar} disabled={descargando || operacionIds.length === 0}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white font-bold text-sm transition-all disabled:opacity-40 ${className || ""}`}>
      {descargando ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} />}
      {descargando ? "Generando ZIP..." : `Legajos (${operacionIds.length})`}
    </button>
  );
}
