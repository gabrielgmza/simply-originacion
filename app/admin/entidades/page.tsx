"use client";
import { Settings, DollarSign, Users, ShieldCheck, Save } from "lucide-react";

export default function AdminEntidades() {
  return (
    <div className="p-10 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white italic mb-10 tracking-tighter">Administración de Clientes SaaS</h1>
      
      <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px] mb-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="text-blue-500" /> Configuración de Cobro: CrediPrueba
          </h2>
          <span className="bg-blue-600 text-[10px] font-black px-4 py-1 rounded-full text-white uppercase tracking-widest italic">Plan Premium</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block">Esquema de Comisión</label>
            <select className="w-full bg-[#050505] border border-gray-800 p-4 rounded-2xl text-white outline-none">
              <option value="bruta">Comisión sobre Venta Bruta</option>
              <option value="neta">Comisión sobre Venta Neta</option>
              <option value="abono">Abono Fijo Mensual</option>
              <option value="autoajustable">Abono por Cantidad de Clientes</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block">Valor (%) o Monto ($)</label>
            <input type="number" placeholder="2.5" className="w-full bg-[#050505] border border-gray-800 p-4 rounded-2xl text-white outline-none" />
          </div>
          <div className="flex items-end">
            <button className="w-full bg-white text-black py-4 rounded-2xl font-black flex justify-center items-center gap-2">
              <Save size={18}/> Actualizar Acuerdo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
