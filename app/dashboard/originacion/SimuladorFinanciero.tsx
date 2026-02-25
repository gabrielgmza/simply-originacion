"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calculator, Percent, Check, Landmark, Info } from "lucide-react";

interface Props {
  monto: number;
  cuotas: number;
  config: any;
  entidadId: string;
  onConfirm: (data: any) => void;
}

export default function SimuladorFinanciero({ monto, cuotas, config, entidadId, onConfirm }: Props) {
  const [ofertas, setOfertas] = useState<any[]>([]);
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calcularOfertas = async () => {
      setLoading(true);
      try {
        // 1. Obtener Fondeadores de la Entidad
        const q = query(collection(db, "fondeadores"), where("entidadId", "==", entidadId), where("activo", "==", true));
        const snap = await getDocs(q);
        const fondeadores = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. Agregar la opción de "Capital Propio" de la Entidad
        const opciones = [
          {
            id: "propio",
            nombre: "Capital Propio (Entidad)",
            tna: config.tasaInteresBase,
            plazoMax: 24
          },
          ...fondeadores.map(f => ({
            id: f.id,
            nombre: f.nombre,
            tna: f.tnaPropia,
            plazoMax: f.plazoMaximo
          }))
        ];

        // 3. Calcular matemática para cada opción
        const resultados = opciones.map(opt => {
          const TEM = (opt.tna / 100) / 12;
          const cuotaPura = (monto * TEM * Math.pow(1 + TEM, cuotas)) / (Math.pow(1 + TEM, cuotas) - 1);
          const costoSeguroVida = (monto * (config.seguroVidaPorc || 0)) / 100;
          const cuotaFinal = cuotaPura + costoSeguroVida;
          const totalDevolver = cuotaFinal * cuotas;
          const cft = ((totalDevolver / monto) - 1) * (12 / cuotas) * 100;
          const gastosOtorgamiento = (monto * (config.gastosOtorgamientoPorc || 0)) / 100;

          return {
            ...opt,
            cuotaFinal,
            cft,
            totalDevolver,
            gastosOtorgamiento,
            capitalNeto: monto - gastosOtorgamiento
          };
        });

        setOfertas(resultados);
        if (resultados.length > 0) setOfertaSeleccionada(resultados[0]);
      } catch (error) {
        console.error("Error al calcular ofertas:", error);
      } finally {
        setLoading(false);
      }
    };

    calcularOfertas();
  }, [monto, cuotas, config, entidadId]);

  if (loading) return <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2"><Calculator className="animate-spin" /> Calculando mejores ofertas...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
        <Info size={16} />
        <span>Selecciona el Fondeador para financiar esta operación:</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {ofertas.map((oferta) => (
          <div 
            key={oferta.id}
            onClick={() => setOfertaSeleccionada(oferta)}
            className={`cursor-pointer transition-all border-2 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 ${
              ofertaSeleccionada?.id === oferta.id 
                ? 'bg-gray-900/50 border-[#FF5E14] shadow-[0_0_15px_rgba(255,94,20,0.1)]' 
                : 'bg-[#0A0A0A] border-gray-800 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${ofertaSeleccionada?.id === oferta.id ? 'bg-[#FF5E14] text-white' : 'bg-gray-800 text-gray-400'}`}>
                <Landmark size={24} />
              </div>
              <div>
                <h4 className="font-bold text-lg">{oferta.nombre}</h4>
                <p className="text-xs text-gray-500 uppercase tracking-wider">TNA: {oferta.tna}% | CFT: {oferta.cft.toFixed(2)}%</p>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-2xl font-black text-white">${oferta.cuotaFinal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-gray-500">CUOTA MENSUAL (IVA Inc.)</p>
            </div>

            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${ofertaSeleccionada?.id === oferta.id ? 'bg-[#FF5E14] border-[#FF5E14]' : 'border-gray-700'}`}>
              {ofertaSeleccionada?.id === oferta.id && <Check size={14} className="text-white" />}
            </div>
          </div>
        ))}
      </div>

      {ofertaSeleccionada && (
        <div className="bg-[#111] border border-gray-800 rounded-xl p-6 mt-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-gray-500 uppercase">Capital a Desembolsar (Neto)</p>
              <p className="text-2xl font-bold text-green-500">${ofertaSeleccionada.capitalNeto.toLocaleString('es-AR')}</p>
            </div>
            <button 
              onClick={() => onConfirm(ofertaSeleccionada)}
              className="px-10 py-4 rounded-xl font-bold text-lg transition-all hover:scale-[1.02]"
              style={{ backgroundColor: "#FF5E14" }}
            >
              Confirmar Oferta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
