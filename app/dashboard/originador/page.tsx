"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, ShieldCheck, CreditCard, Loader2 } from "lucide-react";

export default function OriginadorPage() {
  const { entidadData } = useAuth();
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cuit, setCuit] = useState("");
  const [score, setScore] = useState<any>(null);

  const consultarBCRA = async () => {
    setLoading(true);
    // Simulación de la respuesta de la API que ya tenemos en /api/bcra/consultar
    setTimeout(() => {
      setScore({ situacion: 1, denominacion: "VALIDADO OK", deudas: 0 });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-3xl animate-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-black text-white mb-8">Originador Pro</h1>
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[40px] p-10">
        {paso === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4 text-blue-500">
              <Search /> <h2 className="font-bold text-xl">Consulta de Riesgo BCRA</h2>
            </div>
            <input 
              type="text" 
              placeholder="CUIT / CUIL del solicitante" 
              className="w-full bg-[#050505] border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
            />
            {score ? (
               <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl flex justify-between items-center">
                 <div><p className="text-[10px] font-bold text-green-500 uppercase">Situación Crediticia</p><p className="text-xl font-black">Nivel {score.situacion}</p></div>
                 <button onClick={() => setPaso(2)} className="bg-green-600 px-6 py-2 rounded-xl font-bold">Continuar</button>
               </div>
            ) : (
              <button onClick={consultarBCRA} disabled={loading} className="w-full bg-blue-600 py-4 rounded-2xl font-bold flex justify-center items-center gap-2">
                {loading ? <Loader2 className="animate-spin"/> : "Validar Identidad"}
              </button>
            )}
          </div>
        )}
        {paso === 2 && (
          <div className="space-y-6">
             <div className="flex items-center gap-4 mb-4 text-green-500">
              <CreditCard /> <h2 className="font-bold text-xl">Condiciones del Crédito</h2>
            </div>
            <p className="text-gray-400 text-sm">TNA Aplicable: {entidadData?.configuracion?.tasaInteresBase || '145%'} (Adelantos)</p>
            <button onClick={() => setPaso(1)} className="text-gray-600 text-sm underline">Volver a consulta</button>
          </div>
        )}
      </div>
    </div>
  );
}
