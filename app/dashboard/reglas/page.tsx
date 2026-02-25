"use client";
import { Percent, Gavel, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ReglasPage() {
  const { entidadData } = useAuth();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white tracking-tighter">Política de Crédito</h1>
        <p className="text-gray-500 text-sm">Parámetros financieros para {entidadData?.nombre}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[48px] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Percent size={80}/></div>
          <h3 className="text-sm font-black text-gray-500 uppercase mb-8 flex items-center gap-2">Tasas Nominales (TNA)</h3>
          <div className="space-y-4">
            <div className="flex justify-between p-5 bg-white/5 rounded-3xl border border-white/5 items-center">
              <span className="text-gray-300 font-bold">Adelantos (Pago360)</span>
              <span className="text-2xl font-black text-white">145%</span>
            </div>
            <div className="flex justify-between p-5 bg-white/5 rounded-3xl border border-white/5 items-center">
              <span className="text-gray-300 font-bold">CUAD (Públicos)</span>
              <span className="text-2xl font-black text-white">98%</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[48px] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Gavel size={80}/></div>
          <h3 className="text-sm font-black text-gray-500 uppercase mb-8 flex items-center gap-2 text-amber-500">Recupero y Mora</h3>
          <div className="space-y-4">
            <div className="flex justify-between p-5 bg-amber-500/5 rounded-3xl border border-amber-500/10 items-center">
              <span className="text-gray-300 font-bold">Interés Punitorio Diario</span>
              <span className="text-2xl font-black text-amber-500">0.12%</span>
            </div>
            <div className="flex justify-between p-5 bg-amber-500/5 rounded-3xl border border-amber-500/10 items-center">
              <span className="text-gray-300 font-bold">Días de Gracia</span>
              <span className="text-2xl font-black text-white">3 Días</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
