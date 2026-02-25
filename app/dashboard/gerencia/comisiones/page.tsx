"use client";
import { Save, Percent, UserCheck } from "lucide-react";

export default function ConfigComisiones() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-black text-white italic mb-10">Reglas de Comisionamiento</h1>
      <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block">Vendedor</label>
            <select className="w-full bg-[#050505] border border-gray-800 p-4 rounded-2xl text-white outline-none">
              <option>Gabriel Galdeano</option>
              <option>Vendedor Prueba 2</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block">Base de Cálculo</label>
            <select className="w-full bg-[#050505] border border-gray-800 p-4 rounded-2xl text-white outline-none">
              <option value="NETO">Sobre Capital Neto</option>
              <option value="BRUTO">Sobre Capital Bruto (con gastos)</option>
              <option value="FIJO">Monto Fijo por Crédito</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block">Valor (%)</label>
            <input type="number" step="0.1" className="w-full bg-[#050505] border border-gray-800 p-4 rounded-2xl text-white outline-none" placeholder="2.5" />
          </div>
        </div>
        <button className="mt-10 bg-white text-black px-10 py-4 rounded-2xl font-black flex items-center gap-2">
          <Save size={18}/> Guardar Esquema
        </button>
      </div>
    </div>
  );
}
