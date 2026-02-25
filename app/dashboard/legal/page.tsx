"use client";
import { FileText, Settings, ShieldCheck, ChevronRight } from "lucide-react";

export default function LegalPage() {
  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white mb-10 tracking-tighter">Motor Legal y Cumplimiento</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl col-span-2">
          <h3 className="text-sm font-black text-gray-500 uppercase mb-6 tracking-widest">Contratos Activos</h3>
          <div className="space-y-4">
            {['Contrato de Mutuo - Adelanto', 'Convenio Libranza - CUAD', 'Autorización de Descuento'].map(t => (
              <div key={t} className="flex items-center justify-between p-4 bg-[#050505] border border-gray-800 rounded-2xl hover:border-gray-600 cursor-pointer transition-all">
                <div className="flex items-center gap-3">
                  <FileText className="text-amber-500" size={20} />
                  <span className="font-bold text-white">{t}</span>
                </div>
                <ChevronRight className="text-gray-700" size={16} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl">
          <h3 className="text-sm font-black text-gray-500 uppercase mb-6 tracking-widest">Clausulas Core</h3>
          <div className="space-y-6">
            <div><p className="text-[10px] text-gray-600 font-bold uppercase">Interés Punitorio</p><p className="text-white font-bold">3.5% Mensual</p></div>
            <div><p className="text-[10px] text-gray-600 font-bold uppercase">Validez Hash</p><p className="text-green-500 font-bold">SHA-256 Habilitado</p></div>
            <div className="pt-4 border-t border-gray-900"><button className="text-blue-500 text-xs font-bold">Editar Configuración Legal</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
