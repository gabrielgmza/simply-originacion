"use client";
import { Database, Lock, Globe, CheckCircle, Save, Loader2 } from "lucide-react";
import { useState } from "react";

export default function ApiConfig() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-white tracking-tighter">Conectividad & APIs</h1>
        <button className="bg-white text-black px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
          <Save size={16}/> Guardar Credenciales
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* CONFIG BCRA */}
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Globe className="text-blue-500" size={20}/> Banco Central (BCRA)</h3>
          <p className="text-xs text-gray-500 mb-6">Consulta automatizada de Central de Deudores y Cheques Rechazados.</p>
          <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl text-green-500 text-xs font-bold flex items-center gap-2">
            <CheckCircle size={14}/> Servicio Vinculado (Open Finance)
          </div>
        </div>

        {/* CONFIG CUAD */}
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Lock className="text-amber-500" size={20}/> CUAD Mendoza</h3>
          <p className="text-xs text-gray-500 mb-4">Token de acceso para bloqueo de cupo y descarga de CAD.</p>
          <input type="password" value="************************" readOnly className="w-full bg-[#050505] border border-gray-800 rounded-xl p-4 text-sm text-gray-400 mb-4 outline-none" />
          <button className="text-[10px] font-black uppercase text-gray-600 hover:text-white transition-colors tracking-widest">Cambiar API Key</button>
        </div>
      </div>
    </div>
  );
}
