"use client";
import { useState } from "react";
import { Search, Gavel, Landmark, CheckCircle, Briefcase, Loader2, AlertCircle } from "lucide-react";

export default function BuscadorScoringReal() {
  const [dni, setDni] = useState("");
  const [sexo, setSexo] = useState("M");
  
  // Estados separados para cada tarjeta
  const [bcraData, setBcraData] = useState<any>(null);
  const [juiciosData, setJuiciosData] = useState<any>(null);
  const [cupoData, setCupoData] = useState<any>(null);
  
  // Estados de carga
  const [loading, setLoading] = useState(false);
  const [statusBot, setStatusBot] = useState<"idle" | "procesando" | "completado" | "error" | "no_empleado">("idle");
  const [statusJuicios, setStatusJuicios] = useState<"idle" | "procesando" | "completado" | "error">("idle");

  const urlBot = "https://simply-bot-mendoza-97321115506.us-central1.run.app";

  const consultarTodo = async () => {
    if (!dni || dni.length < 7) {
      alert("Por favor, ingrese un DNI válido");
      return;
    }
    
    setLoading(true);
    setStatusBot("procesando");
    setStatusJuicios("procesando");
    setBcraData(null);
    setJuiciosData(null);
    setCupoData(null);

    // 1. CONSULTA BCRA (Vía API Next.js)
    fetch('/api/scoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni, sexo })
    })
    .then(res => res.json())
    .then(data => setBcraData(data.bcra))
    .catch(err => console.error("Error BCRA:", err));

    // 2. CONSULTA JUICIOS (Vía Bot Cloud Run)
    fetch(`${urlBot}/api/consultar-juicios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setJuiciosData(data.judicial);
        setStatusJuicios("completado");
      } else {
        setStatusJuicios("error");
      }
    })
    .catch(() => setStatusJuicios("error"));

    // 3. CONSULTA CUPO MENDOZA (Vía Bot Cloud Run)
    fetch(`${urlBot}/api/simular-cupo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni, usuario: "Amarque", password: "uni66" })
    })
    .then(res => res.json())
    .then(data => {
      if (data.noRegistra) {
        setStatusBot("no_empleado");
      } else if (data.success) {
        setCupoData(data.cupoMaximo);
        setStatusBot("completado");
      } else {
        setStatusBot("error");
      }
    })
    .catch(() => setStatusBot("error"))
    .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 bg-[#0A0A0A] p-6 rounded-[32px] border border-gray-800">
        <input 
          value={dni} 
          onChange={(e) => setDni(e.target.value)} 
          placeholder="DNI del Cliente" 
          className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 font-mono text-lg" 
        />
        <select 
          value={sexo} 
          onChange={(e) => setSexo(e.target.value)} 
          className="bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold"
        >
          <option value="M">MASCULINO</option>
          <option value="F">FEMENINO</option>
        </select>
        <button 
          onClick={consultarTodo} 
          disabled={loading} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-10 rounded-2xl font-black flex items-center justify-center gap-2 uppercase transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Search size={20}/>}
          {loading ? "Auditando..." : "Evaluar"}
        </button>
      </div>

      {(bcraData || statusBot !== "idle" || statusJuicios !== "idle") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* TARJETA CUPO MENDOZA */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6 relative">
            <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
              <Briefcase size={14}/> Cupo Mendoza
            </h3>
            
            {statusBot === "procesando" && (
              <div className="flex flex-col gap-2">
                <p className="text-blue-500 font-bold animate-pulse text-sm">Calculando cupo real...</p>
              </div>
            )}
            {statusBot === "no_empleado" && <p className="text-orange-500 font-bold text-sm italic">No registra legajo</p>}
            {statusBot === "completado" && cupoData !== null && (
              <div>
                <p className="text-4xl font-black text-white font-mono">${cupoData.toLocaleString('es-AR')}</p>
                <p className="text-green-500 text-[10px] font-black mt-2 uppercase flex items-center gap-1">
                  <CheckCircle size={12}/> Verificado sin afectación
                </p>
              </div>
            )}
            {statusBot === "error" && <p className="text-red-500 text-sm">Error en el motor de cupo</p>}
          </div>

          {/* TARJETA BCRA */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6">
            <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
              <Landmark size={14}/> Situación BCRA
            </h3>
            {!bcraData ? (
              <p className="text-blue-500 font-bold animate-pulse text-sm">Consultando Central...</p>
            ) : bcraData.tieneDeudas ? (
              <p className="text-2xl font-black text-white uppercase">SITUACIÓN {bcraData.peorSituacion}</p>
            ) : (
              <p className="text-green-500 font-bold italic">SITUACIÓN 1 - LIMPIO</p>
            )}
          </div>

          {/* TARJETA JUDICIAL */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6">
            <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
              <Gavel size={14}/> Concursos / Quiebras
            </h3>
            {statusJuicios === "procesando" && <p className="text-blue-500 font-bold animate-pulse text-sm">Buscando expedientes...</p>}
            {statusJuicios === "error" && <p className="text-red-500 text-sm">Error al conectar con Jus Mendoza</p>}
            {statusJuicios === "completado" && juiciosData && (
              juiciosData.tieneRegistros ? (
                <p className="text-red-500 font-black italic uppercase">Registros Detectados</p>
              ) : (
                <p className="text-green-500 font-bold italic uppercase">Sin Registros</p>
              )
            )}
          </div>

        </div>
      )}
    </div>
  );
}
