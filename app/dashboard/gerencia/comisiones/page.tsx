"use client";
import { Save, Percent, Users, ShieldCheck } from "lucide-react";

export default function AdminComisiones() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-black text-white italic mb-10">Esquemas de Comisiones</h1>
      <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px] space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Seleccionar Vendedor</label>
            <select className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none">
              <option>Gabriel Galdeano</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Base de Cálculo</label>
            <select className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none">
              <option value="NETO">Sobre Capital Neto</option>
              <option value="BRUTO">Sobre Capital Bruto</option>
              <option value="FIJO">Monto Fijo por Operación</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Valor (%)</label>
            <input type="number" placeholder="2.5" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none" />
          </div>
        </div>
        <button className="bg-white text-black px-10 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all flex items-center gap-2">
          <Save size={18}/> Guardar Configuración
        </button>
      </div>
    </div>
  );
}
