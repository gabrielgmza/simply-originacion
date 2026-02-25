"use client";
import { useState } from "react";
import { 
  Search, Filter, MoreHorizontal, 
  CheckCircle2, Clock, AlertCircle, 
  CreditCard, ArrowUpRight 
} from "lucide-react";

export default function ListaOperaciones() {
  const [filtro, setFiltro] = useState("TODOS");

  const estados = [
    { id: 'TODOS', label: 'Todos', color: 'bg-gray-800' },
    { id: 'PENDIENTE', label: 'Pendientes', color: 'bg-yellow-600/20 text-yellow-500' },
    { id: 'FIRMADO', label: 'Firmados', color: 'bg-blue-600/20 text-blue-500' },
    { id: 'TRANSFERIDO', label: 'Liquidados', color: 'bg-green-600/20 text-green-500' }
  ];

  return (
    <div className="p-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Cartera de Operaciones</h1>
          <p className="text-gray-500 text-sm mt-2">Seguimiento en tiempo real por sucursal y estado.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input placeholder="Buscar por DNI o Apellido..." className="bg-[#0A0A0A] border border-gray-800 py-3 pl-12 pr-6 rounded-2xl text-white outline-none focus:border-blue-500 transition-all w-64" />
          </div>
        </div>
      </div>

      {/* Filtros de Estado */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {estados.map((e) => (
          <button 
            key={e.id}
            onClick={() => setFiltro(e.id)}
            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filtro === e.id ? 'border-white bg-white text-black' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[48px] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/[0.02] border-b border-gray-900">
            <tr className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              <th className="p-8">Titular / DNI</th>
              <th className="p-8">Monto Neto</th>
              <th className="p-8">Sucursal</th>
              <th className="p-8">Estado</th>
              <th className="p-8 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            <tr className="hover:bg-white/[0.01] transition-colors group">
              <td className="p-8">
                <div className="flex flex-col">
                  <span className="text-white font-bold italic">ACUÑA, MARCOS JAVIER</span>
                  <span className="text-gray-500 text-xs font-mono">20-35442119-4</span>
                </div>
              </td>
              <td className="p-8 font-black text-white">$450.000,00</td>
              <td className="p-8 text-gray-500 text-sm italic">Mendoza Centro</td>
              <td className="p-8">
                <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                  FIRMADO (OTP OK)
                </span>
              </td>
              <td className="p-8 text-right">
                <button className="p-3 bg-white/5 rounded-2xl text-gray-400 group-hover:text-white group-hover:bg-blue-600 transition-all">
                  <ArrowUpRight size={20} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
