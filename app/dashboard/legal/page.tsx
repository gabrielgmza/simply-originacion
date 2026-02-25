"use client";
import { FileText, Plus, Edit3, Trash2 } from "lucide-react";

export default function LegalPage() {
  return (
    <div className="p-8 text-white">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold flex items-center gap-3"><FileText className="text-amber-500"/> Plantillas Legales</h1>
        <button className="bg-white text-black px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200">
          <Plus size={18}/> Nueva Plantilla
        </button>
      </div>
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-3xl p-8">
        <div className="flex items-center justify-between p-4 border-b border-gray-900">
          <div>
            <p className="font-bold">Contrato de Mutuo - Adelantos</p>
            <p className="text-xs text-gray-500 italic">Mapeo: CBU, Punitorios, Firmas Digitales</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-white/5 rounded-lg"><Edit3 size={18}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}
