"use client";
import { useState } from "react";
import { Wallet, TrendingUp, ArrowDownCircle, FileSpreadsheet, Calculator } from "lucide-react";

export default function ContabilidadDetallada() {
  const [resumen, setResumen] = useState({
    total: 2450000,
    capital: 2100000,
    mora: 350000,
    simply: 61250
  });

  return (
    <div className="p-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">Libro Contable y Conciliación</h1>
        <button className="bg-green-600 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-green-500 transition-all">
          <FileSpreadsheet size={18}/> EXPORTAR CIERRE (.XLSX)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px] border-b-4 border-b-blue-600">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Wallet size={14}/> Total Cobrado</p>
          <p className="text-3xl font-black text-white mt-2">${resumen.total.toLocaleString()}</p>
        </div>
        
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Capital Recuperado</p>
          <p className="text-3xl font-black text-white mt-2">${resumen.capital.toLocaleString()}</p>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14}/> Mora Recaudada</p>
          <p className="text-3xl font-black text-white mt-2">${resumen.mora.toLocaleString()}</p>
        </div>

        <div className="bg-[#141cff]/10 border border-[#141cff]/20 p-8 rounded-[40px]">
          <p className="text-[10px] font-black text-[#141cff] uppercase tracking-widest">Comisión Simply</p>
          <p className="text-3xl font-black text-white mt-2">${resumen.simply.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[48px] overflow-hidden">
        <div className="p-8 border-b border-gray-900 flex justify-between items-center">
          <h3 className="text-white font-bold italic">Últimos Movimientos de Caja</h3>
          <span className="text-xs text-gray-500 font-medium italic">Actualizado en tiempo real</span>
        </div>
        <div className="p-8">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">
                <th className="pb-4">Fecha / Hora</th>
                <th className="pb-4">Concepto</th>
                <th className="pb-4">Cliente</th>
                <th className="pb-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              <tr className="text-sm">
                <td className="py-4 text-gray-400">Hoy 12:45</td>
                <td className="py-4 text-white font-bold">Pago Cuota 03/12</td>
                <td className="py-4 text-gray-400">Marcos Acuña</td>
                <td className="py-4 text-right text-green-500 font-black">+$45.200,00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
