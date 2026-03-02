"use client";
import { useState } from "react";
import { UploadCloud, CheckCircle2, FileText, Calculator, CreditCard, Loader2, LandmarkIcon } from "lucide-react";

// ACA ACEPTAMOS EL DNI REAL COMO UNA PROP
interface Props {
  dniBuscado: string;
}

export default function FormularioAprobacion({ dniBuscado }: Props) {
  const [monto, setMonto] = useState("");
  const [cuotas, setCuotas] = useState("3");
  const [archivos, setArchivos] = useState({ dniFrente: false, dniDorso: false, recibo: false });
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const simularUpload = (tipo: 'dniFrente' | 'dniDorso' | 'recibo') => {
    setArchivos(prev => ({ ...prev, [tipo]: true }));
  };

  const cuotaEstimada = monto ? Math.round((parseInt(monto) * 1.5) / parseInt(cuotas)) : 0;

  const generarYDescargarContrato = async () => {
    setGenerandoPdf(true);
    try {
      const res = await fetch('/api/documentos/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dni: dniBuscado, // ¡USAMOS EL DNI REAL DEL CLIENTE!
          monto: parseInt(monto), 
          cuotas: parseInt(cuotas),
          cuotaEstimada 
        })
      });

      if (!res.ok) throw new Error("Error generando documento");

      // Truco para descargar archivos blob en el navegador
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contrato_Simply_${dniBuscado}_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      alert(`¡Crédito Aprobado para el DNI ${dniBuscado}! El contrato se ha descargado correctamente.`);
    } catch (error) {
      alert("Hubo un problema al generar el contrato.");
      console.error(error);
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Visualización del DNI auditado */}
      <div className="bg-green-950/20 border border-green-900/50 p-4 rounded-xl flex items-center gap-3 mb-6">
          <LandmarkIcon className="text-green-500" size={20}/>
          <p className="text-sm font-bold text-gray-300">Auditoría completada para el DNI: <span className="text-white font-black text-base font-mono ml-1">{dniBuscado}</span></p>
      </div>

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
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Cuota Estimada mensual</p>
                <p className="text-white font-mono text-xl">${cuotaEstimada.toLocaleString('es-AR')}</p>
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
          onClick={generarYDescargarContrato}
          disabled={!monto || !archivos.dniFrente || generandoPdf}
          className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black uppercase tracking-widest py-5 rounded-2xl transition-all flex justify-center items-center gap-2 text-lg"
        >
          {generandoPdf ? <Loader2 className="animate-spin" size={24}/> : <CheckCircle2 size={24}/>}
          {generandoPdf ? "Generando Pagaré..." : "Aprobar Crédito y Generar Contrato"}
        </button>
      </div>
    </div>
  );
}
