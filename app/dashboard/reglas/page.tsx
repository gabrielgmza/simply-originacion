"use client";
import { Percent, Gavel, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ReglasPage() {
  const { entidadData } = useAuth();
  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white mb-10 tracking-tighter">Política de Crédito</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[48px]">
          <h3 className="text-sm font-black text-gray-500 uppercase mb-8 flex items-center gap-2">Tasas TNA</h3>
          <div className="space-y-4">
            <div className="flex justify-between p-5 bg-white/5 rounded-3xl border border-white/5">
              <span className="text-gray-300 font-bold">Adelantos</span>
              <span className="text-2xl font-black text-white">145%</span>
            </div>
            <div className="flex justify-between p-5 bg-white/5 rounded-3xl border border-white/5">
              <span className="text-gray-300 font-bold">CUAD</span>
              <span className="text-2xl font-black text-white">98%</span>
            </div>
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[48px]">
          <h3 className="text-sm font-black text-amber-500 uppercase mb-8 flex items-center gap-2">Mora Legal</h3>
          <div className="space-y-4">
            <div className="flex justify-between p-5 bg-amber-500/5 rounded-3xl border border-amber-500/10">
              <span className="text-gray-300 font-bold">Punitorio Diario</span>
              <span className="text-2xl font-black text-amber-500">0.12%</span>
            </div>
            <div className="flex justify-between p-5 bg-amber-500/5 rounded-3xl border border-amber-500/10">
              <span className="text-gray-300 font-bold">Gracia</span>
              <span className="text-2xl font-black text-white">3 Días</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
