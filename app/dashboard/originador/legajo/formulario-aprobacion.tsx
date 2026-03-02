"use client";
import { useState } from "react";
import { UploadCloud, CheckCircle2, FileText, Calculator, CreditCard } from "lucide-react";

export default function FormularioAprobacion() {
  const [monto, setMonto] = useState("");
  const [cuotas, setCuotas] = useState("3");
  const [archivos, setArchivos] = useState({ dniFrente: false, dniDorso: false, recibo: false });

  const simularUpload = (tipo: 'dniFrente' | 'dniDorso' | 'recibo') => {
    // Acá luego conectaremos con AWS S3 o Vercel Blob
    setArchivos(prev => ({ ...prev, [tipo]: true }));
  };

  return (
    <div className="mt-8 bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
        <div className="bg-green-600/20 p-2 rounded-xl text-green-500"><Calculator size={24}/></div>
        <h2 className="text-2xl font-black text-white uppercase tracking-wide">Estructura del Crédito</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* COLUMNA 1: Datos del Préstamo */}
        <div className="space-y-6">
          <div>
            <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Monto a Otorgar ($)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input 
                type="number" 
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 150000" 
                className="w-full bg-black border border-gray-800 p-4 pl-8 rounded-2xl text-white outline-none focus:border-green-500 font-mono text-lg transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Plan de Cuotas</label>
            <select 
              value={cuotas}
              onChange={(e) => setCuotas(e.target.value)}
              className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-green-500 font-bold transition-colors"
            >
              <option value="1">1 Cuota</option>
              <option value="3">3 Cuotas</option>
              <option value="6">6 Cuotas</option>
              <option value="12">12 Cuotas</option>
            </select>
          </div>
          
          <div className="bg-[#111] p-4 rounded-xl border border-gray-800 flex justify-between items-center">
             <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Cuota Estimada</p>
                <p className="text-white font-mono text-xl">${monto ? Math.round((parseInt(monto) * 1.5) / parseInt(cuotas)).toLocaleString('es-AR') : "0"}</p>
             </div>
             <CreditCard className="text-gray-600" size={28}/>
          </div>
        </div>

        {/* COLUMNA 2: Documentación */}
        <div>
          <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">Documentación Requerida</label>
          <div className="space-y-3">
            
            <button onClick={() => simularUpload('dniFrente')} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${archivos.dniFrente ? 'bg-green-900/20 border-green-900 text-green-500' : 'bg-black border-gray-800 text-gray-400 hover:border-gray-600'}`}>
              <span className="font-bold flex items-center gap-2"><FileText size={18}/> DNI Frente</span>
              {archivos.dniFrente ? <CheckCircle2 size={20}/> : <UploadCloud size={20}/>}
            </button>

            <button onClick={() => simularUpload('dniDorso')} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${archivos.dniDorso ? 'bg-green-900/20 border-green-900 text-green-500' : 'bg-black border-gray-800 text-gray-400 hover:border-gray-600'}`}>
              <span className="font-bold flex items-center gap-2"><FileText size={18}/> DNI Dorso</span>
              {archivos.dniDorso ? <CheckCircle2 size={20}/> : <UploadCloud size={20}/>}
            </button>

            <button onClick={() => simularUpload('recibo')} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${archivos.recibo ? 'bg-green-900/20 border-green-900 text-green-500' : 'bg-black border-gray-800 text-gray-400 hover:border-gray-600'}`}>
              <span className="font-bold flex items-center gap-2"><FileText size={18}/> Recibo de Sueldo</span>
              {archivos.recibo ? <CheckCircle2 size={20}/> : <UploadCloud size={20}/>}
            </button>

          </div>
        </div>
      </div>

      {/* BOTÓN FINAL */}
      <div className="mt-8 pt-6 border-t border-gray-800">
        <button 
          disabled={!monto || !archivos.dniFrente}
          className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black uppercase tracking-widest py-5 rounded-2xl transition-all flex justify-center items-center gap-2 text-lg"
        >
          <CheckCircle2 size={24}/>
          Aprobar Crédito y Generar Contrato
        </button>
      </div>
    </div>
  );
}
