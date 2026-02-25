"use client";
import { ShieldAlert, CheckCircle, Save, Gavel } from "lucide-react";

export default function ConfigRiesgoEntidad() {
  return (
    <div className="p-10 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white italic mb-10 tracking-tighter uppercase">Criterios de Admisión (Mundo Entidad)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Política BCRA */}
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px] space-y-6">
          <h2 className="text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Situación BCRA</h2>
          <select className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none font-bold">
            <option>Permitir hasta Situación 1 (Normal)</option>
            <option>Permitir hasta Situación 2 (Riesgo Bajo)</option>
            <option>Permitir hasta Situación 3 (Riesgo Medio)</option>
            <option>Revisión Manual para todos</option>
          </select>
          <p className="text-[10px] text-gray-500 italic">Define el nivel máximo de deuda en BCRA que tu entidad acepta automáticamente.</p>
        </div>

        {/* Política Judicial Mendoza */}
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px] space-y-6">
          <h2 className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Gavel size={14}/> Concursos y Quiebras</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-black/50 p-4 rounded-xl border border-gray-900">
              <span className="text-xs text-white">¿Rechazar Quiebras Vigentes?</span>
              <input type="checkbox" className="w-5 h-5 accent-red-600" defaultChecked />
            </div>
            <input type="number" placeholder="Antigüedad mínima (Meses)" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none" />
          </div>
        </div>
      </div>

      <button className="w-full mt-10 bg-white text-black py-6 rounded-3xl font-black flex justify-center items-center gap-3 hover:bg-gray-200 transition-all uppercase italic">
        <Save size={20}/> Guardar Política de Riesgo
      </button>
    </div>
  );
}
