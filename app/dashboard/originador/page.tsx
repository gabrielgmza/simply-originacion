"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, ShieldCheck, CreditCard, Loader2, AlertTriangle, FileWarning } from "lucide-react";

export default function OriginadorPage() {
  const { entidadData } = useAuth();
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dni, setDni] = useState("");
  const [score, setScore] = useState<any>(null);

  const consultarBCRA = async () => {
    if(!dni) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bcra/consultar", {
        method: "POST",
        body: JSON.stringify({ cuil: dni })
      });
      const data = await res.json();
      setScore(data);
      setLoading(false);
      setPaso(2);
    } catch (e) {
      setLoading(false);
      alert("Error en la consulta real");
    }
  };

  return (
    <div className="max-w-4xl animate-in fade-in duration-700">
      <h1 className="text-4xl font-black text-white mb-10 tracking-tighter italic">Originador Pro</h1>
      
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[48px] p-12">
        {paso === 1 && (
          <div className="space-y-8 text-center">
            <Search className="mx-auto text-blue-500" size={48} />
            <h2 className="text-2xl font-bold text-white">Análisis BCRA en Tiempo Real</h2>
            <input 
              type="text" 
              placeholder="Ingresa CUIT/CUIL" 
              className="w-full bg-[#050505] border border-gray-800 p-6 rounded-3xl text-white text-center text-xl"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
            />
            <button onClick={consultarBCRA} disabled={loading} className="w-full bg-blue-600 py-5 rounded-3xl font-black text-white">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "VERIFICAR AHORA"}
            </button>
          </div>
        )}

        {paso === 2 && score && (
          <div className="space-y-6 animate-in zoom-in-95">
             <div className={`p-8 rounded-[32px] border ${score.situacionCrediticia > 2 || score.tieneChequesRechazados ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
               <div className="flex justify-between items-start">
                 <div>
                   <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Resultado Scoring</p>
                   <h2 className="text-2xl font-black text-white mt-1">{score.denominacionBCRA}</h2>
                 </div>
                 <div className={`px-4 py-2 rounded-xl font-black ${score.situacionCrediticia > 2 ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                   CAT {score.situacionCrediticia}
                 </div>
               </div>

               {score.tieneChequesRechazados && (
                 <div className="mt-6 p-4 bg-red-600 text-white rounded-2xl flex items-center gap-3 animate-pulse">
                   <FileWarning /> <span className="font-bold uppercase text-xs">Atención: Posee Cheques Rechazados</span>
                 </div>
               )}
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <p className="text-gray-500 text-[10px] font-bold uppercase">Deuda Bancaria</p>
                  <p className="text-xl font-bold text-white">${score.montoDeudaInformada.toLocaleString()}</p>
                </div>
                <button onClick={() => setPaso(1)} className="bg-gray-900 text-gray-400 rounded-3xl font-bold hover:text-white">Nueva Consulta</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
