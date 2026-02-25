"use client";
import { ShieldCheck, Download, FileCheck } from "lucide-react";

export default function BotonLibreDeuda({ saldo }: { saldo: number }) {
  const estaSaldado = saldo === 0;

  return (
    <div className={`p-8 rounded-[40px] border-2 transition-all ${estaSaldado ? 'border-green-600/30 bg-green-600/5' : 'border-gray-800 bg-black/50 opacity-50'}`}>
      <div className="flex items-center gap-4 mb-6">
        <div className={`p-3 rounded-2xl ${estaSaldado ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
          <ShieldCheck size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-white italic">Libre de Deuda</h3>
          <p className="text-[10px] text-gray-500 uppercase font-black">Certificación Final de Legajo</p>
        </div>
      </div>

      <button 
        disabled={!estaSaldado}
        className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm flex justify-center items-center gap-2 hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600 transition-all"
      >
        <Download size={18} /> GENERAR CERTIFICADO PDF
      </button>
      
      {!estaSaldado && (
        <p className="mt-4 text-[9px] text-red-500 font-bold text-center italic">
          * Disponible una vez cancelado el saldo total
        </p>
      )}
    </div>
  );
}
