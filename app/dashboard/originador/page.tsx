"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, ShieldCheck, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function OriginadorPage() {
  const { entidadData } = useAuth();
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dni, setDni] = useState("");
  const [score, setScore] = useState<any>(null);

  const consultarRiesgo = async () => {
    if(!dni) return;
    setLoading(true);
    // Simulación de respuesta de API BCRA (Peor situación 1)
    setTimeout(() => {
      setScore({ situacion: 1, denominacion: "VALIDADO", deudas: 0 });
      setLoading(false);
      setPaso(2);
    }, 1500);
  };

  return (
    <div className="max-w-4xl animate-in slide-in-from-bottom-4 duration-700">
      <h1 className="text-4xl font-black text-white mb-10 tracking-tighter italic">Originador Pro</h1>
      
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[48px] p-12">
        {paso === 1 && (
          <div className="space-y-8 text-center">
            <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="text-blue-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">Análisis de Riesgo BCRA</h2>
            <p className="text-gray-500">Ingresa el DNI/CUIT para verificar situación crediticia y cheques rechazados.</p>
            <input 
              type="text" 
              placeholder="DNI o CUIT del solicitante" 
              className="w-full bg-[#050505] border border-gray-800 p-6 rounded-3xl text-white text-center text-xl outline-none focus:border-blue-500 transition-all"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
            />
            <button 
              onClick={consultarRiesgo} 
              disabled={loading || !dni}
              className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-3xl font-black text-white transition-all flex justify-center items-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin"/> : "CONSULTAR CENTRAL DE DEUDORES"}
            </button>
          </div>
        )}

        {paso === 2 && (
          <div className="animate-in fade-in">
             <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-green-500/20 rounded-2xl text-green-500"><ShieldCheck/></div>
               <div>
                 <h2 className="text-xl font-bold text-white">Apto para Crédito</h2>
                 <p className="text-xs text-gray-500">Situación 1 - Sin cheques rechazados registrados.</p>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-6 mb-8">
               <div className="bg-[#050505] p-6 rounded-3xl border border-gray-900 text-center">
                 <p className="text-[10px] text-gray-600 font-black uppercase">TNA Aplicable</p>
                 <p className="text-3xl font-black text-white">{entidadData?.configuracion?.tasaInteresBase || '145'}%</p>
               </div>
               <div className="bg-[#050505] p-6 rounded-3xl border border-gray-900 text-center">
                 <p className="text-[10px] text-gray-600 font-black uppercase">Punitorio Mora</p>
                 <p className="text-3xl font-black text-amber-500">0.12%</p>
               </div>
             </div>
             <button onClick={() => setPaso(1)} className="text-gray-600 text-sm hover:text-white transition-colors underline">Volver a consultar otro DNI</button>
          </div>
        )}
      </div>
    </div>
  );
}
