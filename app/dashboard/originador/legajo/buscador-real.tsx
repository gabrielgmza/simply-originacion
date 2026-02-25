"use client";
import { useState } from "react";
import { Search, Gavel, Landmark, CheckCircle, UserCheck, Briefcase, Loader2, AlertCircle } from "lucide-react";

export default function BuscadorScoringReal() {
  const [dni, setDni] = useState("");
  const [sexo, setSexo] = useState("M");
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [botStatus, setBotStatus] = useState<"idle" | "procesando" | "completado" | "error">("idle");

  const consultarTodo = async () => {
    if (!dni || dni.length < 7) return alert("DNI inválido");
    
    setLoading(true);
    setBotStatus("procesando");
    setResultado(null);

    try {
      // 1. Consulta rápida (BCRA y Juicios) via nuestra API de Vercel
      const resScoring = await fetch('/api/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, sexo })
      });
      const dataScoring = await resScoring.json();
      setResultado(dataScoring);

      // 2. Consulta pesada al BOT de Google Cloud Run (Cupo Mendoza)
      const resBot = await fetch('https://simply-bot-mendoza-97321115506.us-central1.run.app/api/simular-cupo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dni, 
          usuario: "Amarque", 
          password: "uni66",
          min: 1000, 
          max: 500000 
        })
      });
      
      const dataBot = await resBot.json();
      
      if (dataBot.success) {
        setResultado((prev: any) => ({ ...prev, cupoReal: dataBot.cupoMaximo }));
        setBotStatus("completado");
      } else {
        setBotStatus("error");
      }

    } catch (e) {
      console.error(e);
      setBotStatus("error");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 bg-[#0A0A0A] p-6 rounded-[32px] border border-gray-800">
        <input 
          value={dni} onChange={(e) => setDni(e.target.value)} 
          placeholder="DNI Cliente" 
          className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 font-mono text-lg" 
        />
        <select value={sexo} onChange={(e) => setSexo(e.target.value)} className="bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold w-48">
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
        <button onClick={consultarTodo} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-10 rounded-2xl font-black flex items-center gap-2 uppercase transition-all">
          {loading ? <Loader2 className="animate-spin" /> : <Search size={20}/>} {loading ? "AUDITANDO..." : "EVALUAR"}
        </button>
      </div>

      {resultado && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* TARJETA CUPO MENDOZA (GOOGLE CLOUD RUN) */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6 relative overflow-hidden">
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                  <Briefcase size={14}/> Cupo Disponible (Bot)
                </h3>
                {botStatus === "procesando" && <Loader2 className="animate-spin text-blue-500" size={16} />}
             </div>

             {botStatus === "procesando" ? (
               <p className="text-blue-500 font-bold animate-pulse text-sm">El bot está probando montos y resolviendo captchas...</p>
             ) : resultado.cupoReal !== undefined ? (
               <div>
                  <p className="text-4xl font-black text-white font-mono">${resultado.cupoReal.toLocaleString('es-AR')}</p>
                  <p className="text-green-500 text-[10px] font-black mt-2 uppercase flex items-center gap-1">
                    <CheckCircle size={12}/> Cupo máximo verificado sin afectación
                  </p>
               </div>
             ) : (
               <p className="text-gray-600 text-sm italic flex items-center gap-2"><AlertCircle size={14}/> Esperando respuesta del bot...</p>
             )}
          </div>

          {/* TARJETA BCRA */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6">
            <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2"><Landmark size={14}/> BCRA</h3>
            {resultado.bcra?.tieneDeudas ? (
              <p className="text-2xl font-black text-white">SITUACIÓN {resultado.bcra.peorSituacion}</p>
            ) : <p className="text-green-500 font-bold italic">SITUACIÓN 1 - LIMPIO</p>}
          </div>

          {/* TARJETA JUDICIAL */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6">
            <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2"><Gavel size={14}/> Concursos / Quiebras</h3>
            {resultado.judicial?.tieneRegistros ? (
              <p className="text-red-500 font-black italic">REGISTROS DETECTADOS</p>
            ) : <p className="text-green-500 font-bold italic">SIN REGISTROS</p>}
          </div>

        </div>
      )}
    </div>
  );
}
