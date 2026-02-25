"use client";
import { useState } from "react";
import { Search, Gavel, Landmark, CheckCircle, Briefcase, Loader2, AlertTriangle, X } from "lucide-react";

export default function BuscadorScoringReal() {
  const [documento, setDocumento] = useState("");
  const [sexo, setSexo] = useState("M");
  const [nombreCliente, setNombreCliente] = useState("");
  
  const [bcraData, setBcraData] = useState<any>(null);
  const [juiciosData, setJuiciosData] = useState<any>(null);
  const [cupoData, setCupoData] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [statusBot, setStatusBot] = useState<"idle" | "procesando" | "completado" | "error" | "no_empleado">("idle");
  const [statusJuicios, setStatusJuicios] = useState<"idle" | "procesando" | "completado" | "error">("idle");

  const [modalActivo, setModalActivo] = useState<"bcra" | "cuad" | "juicios" | null>(null);

  const urlBot = "https://simply-bot-mendoza-97321115506.us-central1.run.app";

  const consultarTodo = async () => {
    if (documento.length < 7) return alert("Ingrese DNI o CUIL válido");
    
    setLoading(true); setNombreCliente(""); setStatusBot("procesando"); setStatusJuicios("procesando");
    setBcraData(null); setJuiciosData(null); setCupoData(null);

    // 1. BCRA
    fetch('/api/scoring', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento, sexo })
    }).then(res => res.json()).then(data => {
      if(data.success && !data.bcra.error) {
        setBcraData(data.bcra);
        if(data.bcra.nombre) setNombreCliente(data.bcra.nombre);
      } else { setBcraData({ error: true }); }
    }).catch(() => setBcraData({ error: true }));

    // 2. JUICIOS
    fetch(`${urlBot}/api/consultar-juicios`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni: documento })
    }).then(res => res.json()).then(data => {
      if (data.success && !data.error) {
        setJuiciosData(data.judicial); setStatusJuicios("completado");
      } else { setStatusJuicios("error"); }
    }).catch(() => setStatusJuicios("error"));

    // 3. CUPO
    fetch(`${urlBot}/api/simular-cupo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni: documento, usuario: "Amarque", password: "uni66" })
    }).then(res => res.json()).then(data => {
      if (data.error) setStatusBot("error");
      else if (data.noRegistra) setStatusBot("no_empleado");
      else if (data.success) {
        setCupoData({ maximo: data.cupoMaximo, iteraciones: data.iteraciones });
        setStatusBot("completado");
        if(data.nombre && !nombreCliente) setNombreCliente(data.nombre);
      }
    }).catch(() => setStatusBot("error")).finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      {/* BUSCADOR */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#0A0A0A] p-6 rounded-[32px] border border-gray-800">
        <input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="DNI o CUIL (Sin guiones)" className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 font-mono text-lg" />
        <select value={sexo} onChange={(e) => setSexo(e.target.value)} className="bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold">
          <option value="M">MASCULINO</option><option value="F">FEMENINO</option>
        </select>
        <button onClick={consultarTodo} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-10 rounded-2xl font-black flex items-center justify-center gap-2 uppercase transition-all disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : <Search size={20}/>} {loading ? "Auditando..." : "Evaluar"}
        </button>
      </div>

      {nombreCliente && <h2 className="text-xl font-bold text-white px-2 uppercase tracking-wide">{nombreCliente}</h2>}

      {/* TARJETAS */}
      {(bcraData || statusBot !== "idle" || statusJuicios !== "idle") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* CUPO */}
          <div onClick={() => statusBot === "completado" && setModalActivo("cuad")} className={`bg-[#0A0A0A] border ${statusBot === "error" ? 'border-red-900' : 'border-gray-800'} rounded-[32px] p-6 relative ${statusBot === "completado" ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}>
            <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2"><Briefcase size={14}/> Cupo Mendoza</h3>
            {statusBot === "procesando" && <p className="text-blue-500 font-bold animate-pulse text-sm">Validando portal...</p>}
            {statusBot === "no_empleado" && <p className="text-orange-500 font-bold text-sm italic">No registra legajo</p>}
            {statusBot === "error" && <p className="text-red-500 font-bold text-sm flex flex-col gap-1"><AlertTriangle size={16}/> PROVEEDOR CON PROBLEMAS</p>}
            {statusBot === "completado" && cupoData && (
              <div>
                <p className="text-4xl font-black text-white font-mono">${cupoData.maximo.toLocaleString('es-AR')}</p>
                <p className="text-green-500 text-[10px] font-black mt-2 uppercase flex items-center gap-1"><CheckCircle size={12}/> Toca para ver detalles</p>
              </div>
            )}
          </div>

          {/* BCRA */}
          <div onClick={() => bcraData && !bcraData.error && setModalActivo("bcra")} className={`bg-[#0A0A0A] border ${bcraData?.error ? 'border-red-900' : 'border-gray-800'} rounded-[32px] p-6 ${bcraData && !bcraData.error ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}>
            <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2"><Landmark size={14}/> Situación BCRA</h3>
            {!bcraData ? <p className="text-blue-500 font-bold animate-pulse text-sm">Consultando...</p> : 
              bcraData.error ? <p className="text-red-500 font-bold text-sm flex flex-col gap-1"><AlertTriangle size={16}/> PROVEEDOR CON PROBLEMAS</p> :
              bcraData.tieneDeudas ? <p className="text-2xl font-black text-white uppercase">SITUACIÓN {bcraData.peorSituacion}</p> :
              <p className="text-green-500 font-bold italic">SITUACIÓN 1 - LIMPIO</p>
            }
          </div>

          {/* JUICIOS */}
          <div onClick={() => statusJuicios === "completado" && setModalActivo("juicios")} className={`bg-[#0A0A0A] border ${statusJuicios === "error" ? 'border-red-900' : 'border-gray-800'} rounded-[32px] p-6 ${statusJuicios === "completado" ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}>
            <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2"><Gavel size={14}/> Concursos / Quiebras</h3>
            {statusJuicios === "procesando" && <p className="text-blue-500 font-bold animate-pulse text-sm">Buscando expedientes...</p>}
            {statusJuicios === "error" && <p className="text-red-500 font-bold text-sm flex flex-col gap-1"><AlertTriangle size={16}/> PROVEEDOR CON PROBLEMAS</p>}
            {statusJuicios === "completado" && juiciosData && (
              juiciosData.tieneRegistros ? <p className="text-red-500 font-black italic uppercase">Registros Detectados</p> : <p className="text-green-500 font-bold italic uppercase">Sin Registros</p>
            )}
          </div>
        </div>
      )}

      {/* MODALES DE DETALLE */}
      {modalActivo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setModalActivo(null)}>
          <div className="bg-[#111] border border-gray-800 rounded-[32px] p-8 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalActivo(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X size={24}/></button>
            
            {modalActivo === 'bcra' && (
              <>
                <h2 className="text-2xl font-black text-white mb-4 uppercase flex items-center gap-2"><Landmark/> Detalle BCRA</h2>
                <p className="text-gray-400 mb-4 font-mono">CUIL: {bcraData.cuil}</p>
                {bcraData.tieneDeudas ? (
                  <div className="space-y-2">
                    {bcraData.detalles.map((d:any, i:number) => (
                      <div key={i} className="bg-black p-4 rounded-xl border border-gray-800">
                        <p className="text-white font-bold">{d.entidad}</p>
                        <p className="text-red-500 text-sm">Situación: {d.situacion} | Periodo: {d.periodo}</p>
                        <p className="text-gray-400 font-mono mt-1">${(d.monto * 1000).toLocaleString('es-AR')}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-green-500">El cliente no registra deudas en el sistema financiero.</p>}
              </>
            )}

            {modalActivo === 'cuad' && (
              <>
                <h2 className="text-2xl font-black text-white mb-4 uppercase flex items-center gap-2"><Briefcase/> Auditoría de Cupo</h2>
                <div className="bg-black p-4 rounded-xl border border-gray-800">
                  <p className="text-gray-400 text-sm mb-2">Motor de búsqueda binaria ejecutado correctamente.</p>
                  <p className="text-white">Iteraciones para cálculo: <span className="font-bold text-blue-500">{cupoData.iteraciones}</span></p>
                  <p className="text-white mt-2">Cupo máximo garantizado: <span className="font-mono text-green-500">${cupoData.maximo.toLocaleString('es-AR')}</span></p>
                </div>
              </>
            )}

            {modalActivo === 'juicios' && (
              <>
                <h2 className="text-2xl font-black text-white mb-4 uppercase flex items-center gap-2"><Gavel/> Detalle Judicial</h2>
                <div className="bg-black p-4 rounded-xl border border-gray-800 overflow-y-auto max-h-60">
                  {juiciosData.tieneRegistros ? (
                    <p className="text-red-500 text-sm whitespace-pre-wrap">{juiciosData.rawText}</p>
                  ) : <p className="text-green-500">No se encontraron expedientes de quiebra o concurso activos.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
