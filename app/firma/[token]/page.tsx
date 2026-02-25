"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Smartphone, Landmark, CheckCircle, Lock } from "lucide-react";
import { useParams } from "next/navigation";

export default function FlujoFirmaSegura() {
  const { token } = useParams();
  const [paso, setPaso] = useState('OTP'); // OTP -> OFERTAS -> FIRMA
  const [codigo, setCodigo] = useState("");
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState(null);

  // Simulación de ofertas de fondeadores competitivas
  const ofertas = [
    { id: 'f1', nombre: 'Banco Supervielle', cuota: 12500, cft: '142%', recomendada: true },
    { id: 'f2', nombre: 'Fondeadero Privado Mendoza', cuota: 14200, cft: '158%', recomendada: false }
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-[#0A0A0A] border border-gray-800 rounded-[48px] p-10 shadow-2xl">
        
        {/* PASO 1: VALIDACIÓN OTP OBLIGATORIA */}
        {paso === 'OTP' && (
          <div className="text-center animate-in fade-in">
            <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
              <Smartphone className="text-blue-500" size={32} />
            </div>
            <h1 className="text-2xl font-black text-white mb-4 italic">Verifica tu Identidad</h1>
            <p className="text-gray-500 text-sm mb-8">Ingresa el código enviado a tu teléfono para ver las ofertas de crédito disponibles.</p>
            <input 
              type="text" 
              maxLength={6} 
              className="w-full bg-transparent border-b-2 border-gray-800 text-center text-5xl font-black text-white tracking-[0.5em] outline-none focus:border-blue-500 mb-10 pb-4"
              onChange={(e) => e.target.value.length === 6 && setPaso('OFERTAS')}
            />
          </div>
        )}

        {/* PASO 2: SELECCIÓN DE FONDEADOR (SUBASTA) */}
        {paso === 'OFERTAS' && (
          <div className="animate-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Landmark className="text-blue-500"/> Ofertas Disponibles para tu Perfil
            </h2>
            <div className="space-y-4 mb-8">
              {ofertas.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setOfertaSeleccionada(f)}
                  className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${ofertaSeleccionada?.id === f.id ? 'border-blue-500 bg-blue-500/5' : 'border-gray-800 bg-gray-900/20'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">{f.nombre}</p>
                      <p className="text-xs text-gray-500 font-black uppercase">CFT: {f.cft}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-white">${f.cuota.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-600 uppercase">Cuota Mensual</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button 
              disabled={!ofertaSeleccionada}
              onClick={() => setPaso('FIRMA')}
              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black disabled:opacity-50"
            >
              CONTINUAR CON {ofertaSeleccionada?.nombre.toUpperCase()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
