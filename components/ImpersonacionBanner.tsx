"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LogOut, Eye } from "lucide-react";

export default function ImpersonacionBanner() {
  const { impersonando, entidadData, salirImpersonacion } = useAuth();
  const router = useRouter();

  if (!impersonando) return null;

  const handleSalir = () => {
    salirImpersonacion();
    router.push("/admin");
  };

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold">
        <Eye size={13} />
        <span>
          Modo impersonación · Viendo como:{" "}
          <span className="font-black">{entidadData?.nombreFantasia}</span>
        </span>
      </div>
      <button
        onClick={handleSalir}
        className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors px-3 py-1 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20"
      >
        <LogOut size={12} /> Salir
      </button>
    </div>
  );
}
