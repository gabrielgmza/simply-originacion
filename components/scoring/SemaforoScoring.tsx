"use client";
import { AlertTriangle, ShieldX, CheckCircle, Gavel } from "lucide-react";

export default function SemaforoScoring({ datosBcra, datosJudiciales }: any) {
  const tieneQuiebra = datosJudiciales?.tieneRegistros;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Alerta Judicial Crítica */}
      {tieneQuiebra && (
        <div className="bg-red-600/10 border-2 border-red-600 p-6 rounded-[32px] flex items-center gap-6">
          <div className="bg-red-600 p-4 rounded-2xl text-white">
            <ShieldX size={32} />
          </div>
          <div>
            <h3 className="text-red-500 font-black uppercase italic tracking-tighter text-xl">ALERTA: PROCESO CONCURSAL DETECTADO</h3>
            <p className="text-white text-sm font-bold">
              El cliente posee registros en el Registro Judicial de Mendoza. Operación NO RECOMENDADA.
            </p>
          </div>
        </div>
      )}

      {/* Detalle de Procesos */}
      <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
        <h4 className="text-gray-500 text-[10px] font-black uppercase mb-6 flex items-center gap-2">
          <Gavel size={14}/> Antecedentes Judiciales (Mendoza)
        </h4>
        {datosJudiciales?.procesos.map((p: any, i: number) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div><p className="text-gray-600 uppercase font-black">Expediente</p><p className="text-white font-bold">{p.expediente}</p></div>
            <div><p className="text-gray-600 uppercase font-black">Tipo</p><p className="text-red-500 font-black">{p.tipo}</p></div>
            <div><p className="text-gray-600 uppercase font-black">Fecha Inicio</p><p className="text-white font-bold">{p.fechaInicio}</p></div>
            <div><p className="text-gray-600 uppercase font-black">Tribunal</p><p className="text-white font-bold truncate">{p.tribunal}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
