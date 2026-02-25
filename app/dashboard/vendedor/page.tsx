"use client";
import { TrendingUp, Award, DollarSign, FileCheck, Users } from "lucide-react";

export default function DashboardVendedor() {
  const stats = { ops: 12, capital: 1540000, comisiones: 38500 };

  return (
    <div className="p-10 animate-in fade-in duration-700">
      <h1 className="text-3xl font-black text-white italic mb-10 tracking-tighter">Panel de Ventas</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <p className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2"><FileCheck size={14}/> Legajos</p>
          <p className="text-3xl font-black text-white mt-2">{stats.ops}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <p className="text-[10px] font-black text-gray-500 uppercase">Capital Colocado</p>
          <p className="text-3xl font-black text-white mt-2">${stats.capital.toLocaleString()}</p>
        </div>
        <div className="bg-blue-600 p-8 rounded-[40px] shadow-xl">
          <p className="text-[10px] font-black text-white/60 uppercase flex items-center gap-2"><Award size={14}/> Mis Ganancias</p>
          <p className="text-3xl font-black text-white mt-2">${stats.comisiones.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
