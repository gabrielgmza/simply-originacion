"use client";
import { Landmark, Check, X } from "lucide-react";

export default function ModalFondeo({ fondeadores, onSeleccionar, onClose }: any) {
  if (!fondeadores) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-gray-800 w-full max-w-xl rounded-[48px] p-10 relative shadow-2xl animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
          <X size={24} />
        </button>
        
        <div className="mb-10">
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Seleccionar Fondeo</h2>
          <p className="text-gray-500 text-xs mt-2 font-bold uppercase tracking-widest">Ofertas disponibles para el perfil del cliente</p>
        </div>
        
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {fondeadores.map((f: any) => (
            <button 
              key={f.id} 
              onClick={() => onSeleccionar(f)}
              className="w-full group flex items-center justify-between p-6 rounded-[32px] border border-gray-900 bg-black hover:border-blue-600 transition-all text-left"
            >
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-600/10 rounded-2xl text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Landmark size={28} />
                </div>
                <div>
                  <p className="text-white font-black text-lg italic">{f.nombre}</p>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">
                    TNA: {f.tna}% • {f.plazo} Meses
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full border border-gray-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                <Check className="text-white opacity-0 group-hover:opacity-100" size={16} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
