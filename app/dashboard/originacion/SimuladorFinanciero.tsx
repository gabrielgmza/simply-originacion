"use client";

import { useState, useEffect } from "react";
import { Calculator, Percent, Info, ShieldCheck } from "lucide-react";

interface Props {
  monto: number;
  cuotas: number;
  config: any;
  onConfirm: (data: any) => void;
}

export default function SimuladorFinanciero({ monto, cuotas, config, onConfirm }: Props) {
  const [analisis, setAnalisis] = useState<any>(null);

  useEffect(() => {
    const tna = config.tasaInteresBase || 0;
    const TEM = (tna / 100) / 12; // Tasa Efectiva Mensual
    const seguroVidaMensual = config.seguroVidaPorc || 0;
    const gastosOtorgamiento = (monto * (config.gastosOtorgamientoPorc || 0)) / 100;
    
    // Fórmula de Sistema Francés: Cuota = [P * i * (1 + i)^n] / [(1 + i)^n - 1]
    const cuotaPura = (monto * TEM * Math.pow(1 + TEM, cuotas)) / (Math.pow(1 + TEM, cuotas) - 1);
    
    // El Seguro de Vida es porcentual sobre el saldo (simplificado sobre el capital inicial para el simulador)
    const costoSeguroVida = (monto * (seguroVidaMensual / 100));
    
    const cuotaFinal = cuotaPura + costoSeguroVida;
    const totalDevolver = cuotaFinal * cuotas;
    
    // Cálculo de CFT (Costo Financiero Total) - Aproximación TNA + Gastos + Seguros
    const cft = ((totalDevolver / monto) - 1) * (12 / cuotas) * 100;

    setAnalisis({
      cuotaPura,
      costoSeguroVida,
      cuotaFinal,
      totalDevolver,
      cft,
      gastosOtorgamiento,
      capitalNeto: monto - gastosOtorgamiento
    });
  }, [monto, cuotas, config]);

  if (!analisis) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-gray-800 p-6 rounded-xl text-center">
          <p className="text-xs text-gray-500 uppercase mb-1">Cuota Mensual</p>
          <p className="text-3xl font-bold" style={{ color: config.colorPrimario }}>
            ${analisis.cuotaFinal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6 rounded-xl text-center">
          <p className="text-xs text-gray-500 uppercase mb-1">Capital Neto a Recibir</p>
          <p className="text-2xl font-bold text-white">
            ${analisis.capitalNeto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">Descontado {config.gastosOtorgamientoPorc}% Gtos.</p>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6 rounded-xl text-center border-l-4" style={{ borderLeftColor: config.colorPrimario }}>
          <p className="text-xs text-gray-500 uppercase mb-1">CFT (Costo Fin. Total)</p>
          <p className="text-2xl font-bold text-white">{analisis.cft.toFixed(2)}%</p>
          <p className="text-[10px] text-gray-400 mt-1 italic font-bold">TNA: {config.tasaInteresBase}%</p>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-gray-300">
          <Info size={16} /> Desglose del Crédito
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Monto Solicitado (Capital Bruto)</span>
            <span className="text-white font-mono">${monto.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Gastos de Otorgamiento ({config.gastosOtorgamientoPorc}%)</span>
            <span className="text-red-400 font-mono">-${analisis.gastosOtorgamiento.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-900 pt-2">
            <span className="text-gray-500 italic">Seguro de Vida Incluido en Cuota ({config.seguroVidaPorc}%)</span>
            <span className="text-gray-400 font-mono">${analisis.costoSeguroVida.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => onConfirm(analisis)}
        className="w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98]"
        style={{ backgroundColor: config.colorPrimario }}
      >
        <ShieldCheck /> Confirmar y Generar Legajo
      </button>
    </div>
  );
}
