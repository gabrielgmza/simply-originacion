"use client";
// app/acceso-denegado/page.tsx
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AccesoDenegadoPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-900/20 flex items-center justify-center mx-auto">
          <ShieldAlert size={28} className="text-red-400"/>
        </div>
        <h1 className="text-xl font-black text-white">Acceso denegado</h1>
        <p className="text-gray-500 text-sm">No tenés permiso para ver esta sección. Contactá a tu administrador.</p>
        <button onClick={() => router.back()}
          className="flex items-center gap-2 mx-auto text-sm text-gray-400 hover:text-white font-bold transition-colors">
          <ArrowLeft size={14}/> Volver
        </button>
      </div>
    </div>
  );
}
