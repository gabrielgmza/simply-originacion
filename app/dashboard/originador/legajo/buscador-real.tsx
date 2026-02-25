"use client";
import { useState } from "react";
import { Search, Gavel, AlertCircle, ShieldCheck } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function BuscadorScoringReal() {
  const [dni, setDni] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const consultarDNI = async () => {
    setLoading(true);
    try {
      // CONSULTA REAL A FIRESTORE
      const q = query(collection(db, "padron_judicial"), where("dni", "==", dni));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setResultado(querySnapshot.docs[0].data());
      } else {
        setResultado({ limpio: true });
      }
    } catch (error) {
      console.error("Error consultando padrón:", error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <input 
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          placeholder="Ingrese DNI para Scoring..." 
          className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white font-mono text-xl outline-none focus:border-blue-500"
        />
        <button 
          onClick={consultarDNI}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 rounded-2xl font-black flex items-center gap-2 transition-all"
        >
          {loading ? "CONSULTANDO..." : <><Search size={20}/> CONSULTAR</>}
        </button>
      </div>

      {resultado && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          {resultado.tieneRegistros ? (
            <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-[40px] space-y-4">
              <div className="flex items-center gap-3 text-red-500 font-black italic">
                <Gavel size={24}/> ATENCIÓN: PROCESO JUDICIAL DETECTADO
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-black/40 p-4 rounded-2xl">
                  <p className="text-gray-500 text-[10px] uppercase font-black">Tipo de Proceso</p>
                  <p className="text-white font-bold">{resultado.procesos[0].tipo}</p>
                </div>
                <div className="bg-black/40 p-4 rounded-2xl">
                  <p className="text-gray-500 text-[10px] uppercase font-black">Fecha Inicio</p>
                  <p className="text-white font-bold">{resultado.procesos[0].fechaInicio}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/50 p-8 rounded-[40px] flex items-center gap-4 text-green-500 font-black italic">
              <ShieldCheck size={24}/> SIN REGISTROS JUDICIALES DE CONCURSOS O QUIEBRAS
            </div>
          )}
        </div>
      )}
    </div>
  );
}
