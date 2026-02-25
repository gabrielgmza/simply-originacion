"use client";
import { useState } from "react";
import { Landmark, CheckCircle, TrendingDown, ShieldCheck, ArrowRight } from "lucide-react";

export default function OriginadorConFondeo() {
  const [paso, setPaso] = useState(1);
  const [ofertas, setOfertas] = useState([
    { id: 'f1', nombre: 'Banco Supervielle', cuota: 12500, cft: '142%', tna: '110%', recomendada: true },
    { id: 'f2', nombre: 'Fondeadero Privado A', cuota: 14200, cft: '158%', tna: '125%', recomendada: false }
  ]);
  const [seleccionada, setSeleccionada] = useState(null);

  return (
    <div className="max-w-6xl p-8 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white italic mb-10 tracking-tighter">Panel de Selección de Fondeo</h1>
      
      {paso === 1 ? (
        <div className="bg-[#0A0A0A] border border-gray-800 p-12 rounded-[48px] text-center">
          <input placeholder="DNI del Empleado Público / Privado" className="w-full bg-[#050505] border border-gray-800 p-6 rounded-3xl text-white text-xl mb-6 text-center outline-none focus:border-blue-500" />
          <button onClick={() => setPaso(2)} className="w-full bg-blue-600 py-6 rounded-3xl font-black text-white italic tracking-widest hover:bg-blue-500 transition-all">CONSULTAR OFERTAS DISPONIBLES</button>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-6">
          <div className="flex items-center gap-3 mb-4 text-blue-500">
            <TrendingDown size={20}/>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mejores opciones de fondeo encontradas</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ofertas.map(o => (
              <div 
                key={o.id}
                onClick={() => setSeleccionada(o.id)}
                className={`relative p-8 rounded-[40px] border-2 transition-all cursor-pointer ${seleccionada === o.id ? 'border-blue-500 bg-blue-500/5' : 'border-gray-800 bg-[#0A0A0A] hover:border-gray-600'}`}
              >
                {o.recomendada && <span className="absolute top-4 right-6 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase italic">Mejor Tasa</span>}
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-white/5 rounded-2xl"><Landmark className="text-gray-400" size={24}/></div>
                  <h3 className="text-xl font-bold text-white">{o.nombre}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-gray-900 pt-6">
                  <div><p className="text-[10px] text-gray-500 font-black uppercase">Cuota Mensual</p><p className="text-2xl font-black text-white">${o.cuota.toLocaleString()}</p></div>
                  <div className="text-right"><p className="text-[10px] text-gray-500 font-black uppercase">CFT Total</p><p className="text-xl font-black text-blue-500">{o.cft}</p></div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-10 bg-white text-black py-6 rounded-3xl font-black flex justify-center items-center gap-3 hover:bg-gray-200 transition-all">
            PROCEDER CON LA SELECCIÓN <ArrowRight size={20}/>
          </button>
        </div>
      )}
    </div>
  );
}
