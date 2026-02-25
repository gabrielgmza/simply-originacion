"use client";
import { useState } from "react";
import { MapPin, Plus, Users, TrendingUp, ChevronRight } from "lucide-react";

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState([
    { id: 'suc_01', nombre: 'Casa Central - Mendoza', localidad: 'Capital', capital: 4500000, vendedores: 8 },
    { id: 'suc_02', nombre: 'Sucursal San Rafael', localidad: 'San Rafael', capital: 1200000, vendedores: 3 }
  ]);

  return (
    <div className="p-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">Sucursales y Puntos de Venta</h1>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
          <Plus size={16}/> Nueva Sucursal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sucursales.map(s => (
          <div key={s.id} className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[48px] hover:border-blue-500/50 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <MapPin size={24} />
              </div>
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-gray-900 px-3 py-1 rounded-full italic">ID: {s.id}</span>
            </div>
            <h3 className="text-xl font-black text-white mb-1">{s.nombre}</h3>
            <p className="text-gray-500 text-sm mb-6 font-medium">{s.localidad}, Mendoza</p>
            
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-900">
              <div>
                <p className="text-[10px] text-gray-600 font-black uppercase mb-1">Capital Colocado</p>
                <p className="text-lg font-bold text-white">${s.capital.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-600 font-black uppercase mb-1">Dotación</p>
                <p className="text-lg font-bold text-white">{s.vendedores} Vendedores</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
