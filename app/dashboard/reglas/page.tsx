"use client";
import { Percent, Gavel, Calendar, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ReglasPage() {
  const { entidadData } = useAuth();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white tracking-tighter">Política de Crédito</h1>
        <p className="text-gray-500 text-sm">Configuración de tasas y condiciones de mora para {entidadData?.nombre}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* BLOQUE DE TASAS */}
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <h3 className="text-sm font-black text-gray-500 uppercase mb-6 flex items-center gap-2">
            <Percent size={18} className="text-blue-500"/> Tasas de Interés (TNA)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between p-4 bg-[#050505] rounded-2xl border border-gray-900">
              <span className="text-gray-400">Adelantos (Pago360)</span>
              <span className="text-white font-bold">145%</span>
            </div>
            <div className="flex justify-between p-4 bg-[#050505] rounded-2xl border border-gray-900">
              <span className="text-gray-400">CUAD (Públicos)</span>
              <span className="text-white font-bold">98%</span>
            </div>
          </div>
        </div>

        {/* BLOQUE DE MORA */}
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <h3 className="text-sm font-black text-gray-500 uppercase mb-6 flex items-center gap-2">
            <Gavel size={18} className="text-red-500"/> Recupero y Mora
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between p-4 bg-[#050505] rounded-2xl border border-gray-900">
              <span className="text-gray-400">Interés Punitorio Diario</span>
              <span className="text-white font-bold">0.12%</span>
            </div>
            <div className="flex justify-between p-4 bg-[#050505] rounded-2xl border border-gray-900">
              <span className="text-gray-400">Días de Gracia</span>
              <span className="text-white font-bold">3 Días</span>
            </div>
          </div>
        </div>
      </div>

      {/* VALIDACIÓN LEGAL */}
      <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl flex items-center gap-4">
        <ShieldCheck className="text-blue-500" size={24} />
        <p className="text-xs text-blue-200/70">
          Estas tasas se aplican automáticamente al cálculo del **CFT** en cada nuevo legajo y se reflejan en las cláusulas del contrato legal.
        </p>
      </div>
    </div>
  );
}
