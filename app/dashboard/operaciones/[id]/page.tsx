"use client";
import { useState } from "react";
import { Upload, CheckCircle, FileText, Download, ExternalLink, Send } from "lucide-react";

export default function DetalleLiquidacion() {
  const [subiendo, setSubiendo] = useState(false);
  const [estado, setEstado] = useState('LIQUIDADO'); // LIQUIDADO -> TRANSFERIDO

  return (
    <div className="p-10 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px]">
            <h2 className="text-2xl font-black text-white mb-6 italic">Estado del Desembolso</h2>
            
            {estado === 'LIQUIDADO' ? (
              <div className="border-2 border-dashed border-gray-800 rounded-3xl p-12 text-center hover:border-blue-500/50 transition-all group">
                <Upload className="mx-auto text-gray-600 mb-4 group-hover:text-blue-500" size={40} />
                <p className="text-white font-bold mb-2">Cargar Comprobante de Transferencia</p>
                <p className="text-gray-500 text-xs mb-6">Formatos permitidos: JPG, PNG o PDF (Máx. 5MB)</p>
                <button 
                  onClick={() => setEstado('TRANSFERIDO')}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm"
                >
                  SELECCIONAR ARCHIVO
                </button>
              </div>
            ) : (
              <div className="bg-green-500/5 border border-green-500/20 rounded-3xl p-8 flex items-center justify-between animate-in zoom-in-95">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-green-500/10 rounded-2xl text-green-500"><FileText size={24}/></div>
                  <div>
                    <p className="text-white font-bold text-sm">Comprobante_Transferencia.pdf</p>
                    <p className="text-[10px] text-green-500 font-black uppercase">Archivo Vinculado Correctamente</p>
                  </div>
                </div>
                <button className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white"><Download size={20}/></button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[48px] h-fit sticky top-10">
          <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-6">Acciones Finales</h3>
          <button 
            disabled={estado !== 'TRANSFERIDO'}
            className="w-full bg-white text-black py-5 rounded-3xl font-black flex justify-center items-center gap-2 disabled:opacity-30 transition-all"
          >
            <Send size={18}/> NOTIFICAR AL CLIENTE
          </button>
          <p className="mt-6 text-[9px] text-gray-600 text-center leading-relaxed">
            Al notificar, el sistema enviará el comprobante vía WhatsApp/Email y cerrará el legajo permanentemente.
          </p>
        </div>
      </div>
    </div>
  );
}
