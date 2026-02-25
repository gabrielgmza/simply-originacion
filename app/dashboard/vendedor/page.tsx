"use client";
import { TrendingUp, Award, DollarSign, FileCheck } from "lucide-react";

export default function DashboardVendedor() {
  const stats = {
    operacionesMes: 14,
    capitalColocado: 1850000,
    comisionesAcumuladas: 46250
  };

  return (
    <div className="p-10 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white italic mb-10 tracking-tighter">Mi Producción</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px] border-l-4 border-l-blue-600">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <FileCheck size={14}/> Legajos Liquidados
          </p>
          <p className="text-3xl font-black text-white mt-2">{stats.operacionesMes}</p>
        </div>
        
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Capital Colocado</p>
          <p className="text-3xl font-black text-white mt-2">${stats.capitalColocado.toLocaleString()}</p>
        </div>

        <div className="bg-blue-600 p-8 rounded-[40px] shadow-2xl shadow-blue-900/20">
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-2">
            <Award size={14}/> Mis Comisiones (ARS)
          </p>
          <p className="text-3xl font-black text-white mt-2">${stats.comisionesAcumuladas.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[48px]">
        <h3 className="text-white font-bold mb-4">Próximos Cobros</h3>
        <p className="text-gray-500 text-sm">Tus comisiones se calculan sobre el capital neto liquidado al 2.5%.</p>
      </div>
    </div>
  );
}
