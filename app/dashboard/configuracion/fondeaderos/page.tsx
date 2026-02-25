"use client";
import { useState } from "react";
import { Landmark, Plus, Percent, Settings } from "lucide-react";

export default function FondeaderosPage() {
  return (
    <div className="p-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-white italic">Gestión de Fondeaderos</h1>
        <button className="bg-white text-black px-6 py-2 rounded-xl font-bold text-sm">+ Agregar Banco/Fondo</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ejemplo de Fondeadero con su propia tasa */}
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px] relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <Landmark className="text-blue-500" size={32} />
            <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">Activo</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Banco Supervielle</h3>
          <div className="space-y-3 pt-4 border-t border-gray-900">
            <div className="flex justify-between text-sm"><span className="text-gray-500">TNA Fondeo</span><span className="text-white font-bold">110%</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Plazo Máx.</span><span className="text-white font-bold">24 Meses</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Comisión Simply</span><span className="text-blue-400 font-black">2.5% Bruto</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
