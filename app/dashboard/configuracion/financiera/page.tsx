"use client";
import { Percent, ShieldAlert, Save, Landmark, CreditCard } from "lucide-react";

export default function ConfigFinancieraEntidad() {
  return (
    <div className="p-10 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white italic mb-10 tracking-tighter">Configuración del "Mundo" Entidad</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tasas Personalizadas */}
        <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px] space-y-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 italic"><Percent className="text-red-500"/> Política de Mora</h2>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-[0.2em]">Tasa Punitoria Diaria (%)</label>
              <input type="number" step="0.01" placeholder="0.12" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white text-xl font-black outline-none focus:border-red-500" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-[0.2em]">Tasa Moratoria Mensual (%)</label>
              <input type="number" step="0.1" placeholder="4.5" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white text-xl font-black outline-none focus:border-red-500" />
            </div>
          </div>
        </div>

        {/* Pasarelas de Pago Propias */}
        <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px] space-y-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 italic"><CreditCard className="text-blue-500"/> Credenciales de Cobro</h2>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-[0.2em]">API Key Pagos360</label>
              <input type="password" placeholder="••••••••••••" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-[0.2em]">Access Token MercadoPago</label>
              <input type="password" placeholder="APP_USR-..." className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <button className="w-full mt-10 bg-white text-black py-6 rounded-3xl font-black flex justify-center items-center gap-3 hover:bg-gray-200 transition-all uppercase italic tracking-widest">
        <Save size={20}/> Guardar Configuración de Entidad
      </button>
    </div>
  );
}
