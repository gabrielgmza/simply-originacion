"use client";
import { Database, Lock, Globe, CheckCircle } from "lucide-react";

export default function ApiConfig() {
  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3"><Database className="text-purple-500"/> Configuración de API</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-3xl">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-400"><Globe size={18}/> Banco Central (BCRA)</h3>
          <p className="text-xs text-gray-500 mb-6">Conexión con la Central de Deudores para scoring en tiempo real.</p>
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle size={14}/> API Online & Verificada
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-3xl">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-yellow-500"><Lock size={18}/> CUAD Mendoza</h3>
          <p className="text-xs text-gray-500 mb-6">Credenciales para bloqueo de cupo y descarga de CAD.</p>
          <input type="password" value="************" readOnly className="w-full bg-[#050505] border border-gray-800 rounded-xl p-3 text-sm mb-4 outline-none" />
          <button className="text-xs font-bold text-gray-400 hover:text-white transition-colors">Actualizar Credenciales</button>
        </div>
      </div>
    </div>
  );
}
