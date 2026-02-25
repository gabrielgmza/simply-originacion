"use client";
import { Landmark, Plus, Settings, BadgePercent, FileStack } from "lucide-react";

export default function GestionFondeaderos() {
  const fondeadores = [
    { id: '1', nombre: 'Banco Supervielle', tna: 110, plazo: 24, activa: true },
    { id: '2', nombre: 'Fondo Inversión Mendoza', tna: 125, plazo: 12, activa: true }
  ];

  return (
    <div className="p-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">Fondeaderos y Capital Tercerizado</h1>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
          <Plus size={16}/> Agregar Fondeador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {fondeadores.map(f => (
          <div key={f.id} className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[48px] hover:border-blue-500/30 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-white/5 rounded-2xl text-gray-400 group-hover:text-blue-500 transition-all">
                <Landmark size={28} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-500 uppercase">TNA Aplicada</p>
                <p className="text-xl font-black text-white">{f.tna}%</p>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-6 italic">{f.nombre}</h3>
            
            <div className="space-y-4 border-t border-gray-900 pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><BadgePercent size={14}/> Plazo Máx.</span>
                <span className="text-white font-bold">{f.plazo} Cuotas</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><FileStack size={14}/> Legajos Vinculados</span>
                <span className="text-blue-500 font-black">Ver todos</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
