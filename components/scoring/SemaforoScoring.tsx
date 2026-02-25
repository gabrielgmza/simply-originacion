"use client";

import { AlertCircle, CheckCircle2, MinusCircle, TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  score: number;
  categoria: 'A+' | 'B' | 'C';
}

export default function SemaforoScoring({ score, categoria }: Props) {
  const configs = {
    'A+': { color: '#22c55e', label: 'Excelente', icon: <CheckCircle2 size={18} />, desc: 'Cliente Premium - Tasa Preferencial' },
    'B': { color: '#eab308', label: 'Moderado', icon: <MinusCircle size={18} />, desc: 'Riesgo Medio - Tasa Estándar' },
    'C': { color: '#ef4444', label: 'Riesgo Alto', icon: <AlertCircle size={18} />, desc: 'Posible Rechazo o Tasa Máxima' }
  };

  const current = configs[categoria];

  return (
    <div className="p-5 rounded-2xl border border-gray-800 bg-[#0A0A0A] animate-in zoom-in duration-300">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Scoring Interno Simply</span>
        <div className="flex items-center gap-1 font-black text-xl" style={{ color: current.color }}>
          {score} <span className="text-[10px] text-gray-600">/ 1000</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <div style={{ color: current.color }}>{current.icon}</div>
        <div>
          <p className="text-sm font-bold" style={{ color: current.color }}>Categoría {categoria}: {current.label}</p>
          <p className="text-[10px] text-gray-500">{current.desc}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1 h-1.5 w-full rounded-full overflow-hidden bg-gray-900">
        <div className={`h-full ${categoria === 'C' ? 'bg-red-500' : 'bg-gray-800'}`}></div>
        <div className={`h-full ${categoria === 'B' ? 'bg-yellow-500' : 'bg-gray-800'}`}></div>
        <div className={`h-full ${categoria === 'A+' ? 'bg-green-500' : 'bg-gray-800'}`}></div>
      </div>
    </div>
  );
}
