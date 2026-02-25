"use client";
import { FileText, Database, ShieldCheck, Download, Code } from "lucide-react";

export default function PlantillasLegales() {
  const camposDisponibles = [
    "{{titular_completo}}", "{{dni_cuil}}", "{{domicilio_legal}}", 
    "{{cbu_alias}}", "{{tna_nominal}}", "{{cft_total}}", "{{punitorio_diario}}"
  ];

  return (
    <div className="p-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">Plantillas y Mapeo Legal</h1>
        <button className="bg-white text-black px-6 py-2 rounded-xl font-bold text-sm">+ Subir Nueva Plantilla</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2 italic"><FileText className="text-blue-500"/> Contrato de Mutuo Base</h3>
            <div className="p-6 bg-[#050505] border border-gray-900 rounded-3xl flex justify-between items-center">
               <span className="text-gray-400 text-sm">Contrato_Mutuo_V4_Final.pdf</span>
               <div className="flex gap-2">
                 <button className="p-2 hover:bg-white/5 rounded-lg text-gray-500"><Code size={18}/></button>
                 <button className="p-2 hover:bg-white/5 rounded-lg text-gray-500"><Download size={18}/></button>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Variables Disponibles</h3>
          <div className="flex flex-wrap gap-2">
            {camposDisponibles.map(c => (
              <span key={c} className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-[10px] font-mono text-gray-400">{c}</span>
            ))}
          </div>
          <p className="mt-8 text-[10px] text-gray-600 leading-relaxed italic">
            * Estas variables se reemplazan automáticamente con los datos del legajo al momento de la firma.
          </p>
        </div>
      </div>
    </div>
  );
}
