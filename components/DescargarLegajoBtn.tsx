"use client";
import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Props {
  operacionId: string;
  variant?: "button" | "icon";
  className?: string;
}

export default function DescargarLegajoBtn({ operacionId, variant = "button", className }: Props) {
  const { entidadData } = useAuth();
  const [descargando, setDescargando] = useState(false);
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const descargar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entidadData?.id) return;
    setDescargando(true);
    try {
      const res = await fetch("/api/legajo/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operacionId, entidadId: entidadData.id }),
      });
      if (!res.ok) { alert("Error al generar el legajo."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legajo-${operacionId.slice(0, 8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Error al descargar el legajo."); }
    finally { setDescargando(false); }
  };

  if (variant === "icon") {
    return (
      <button onClick={descargar} disabled={descargando} title="Descargar legajo completo"
        className={`p-2 rounded-lg transition-colors hover:bg-gray-800 disabled:opacity-50 ${className || "text-gray-400 hover:text-white"}`}>
        {descargando ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
      </button>
    );
  }

  return (
    <button onClick={descargar} disabled={descargando}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 ${className || ""}`}
      style={{ backgroundColor: colorPrimario }}>
      {descargando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {descargando ? "Generando..." : "Legajo PDF"}
    </button>
  );
}
