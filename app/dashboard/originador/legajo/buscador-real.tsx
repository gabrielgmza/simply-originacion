"use client";
import { useState } from "react";
import { Search, Gavel, Landmark, CheckCircle, Briefcase, Loader2, AlertTriangle, X, RefreshCw, AlertCircle, FileText } from "lucide-react";

export default function BuscadorScoringReal() {
  const [documentoRaw, setDocumentoRaw] = useState("");
  const [sexo, setSexo] = useState("M");
  const [errorInput, setErrorInput] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  
  const [bcraData, setBcraData] = useState<any>(null);
  const [juiciosData, setJuiciosData] = useState<any>(null);
  const [cupoData, setCupoData] = useState<any>(null);
  
  const [statusBcra, setStatusBcra] = useState<"idle" | "procesando" | "completado" | "error">("idle");
  const [statusJuicios, setStatusJuicios] = useState<"idle" | "procesando" | "completado" | "error">("idle");
  const [statusBot, setStatusBot] = useState<"idle" | "procesando" | "completado" | "error" | "no_empleado">("idle");

  const [modalActivo, setModalActivo] = useState<"bcra" | "cuad" | "juicios" | null>(null);

  const urlBot = "https://simply-bot-mendoza-97321115506.us-central1.run.app";
  const documento = documentoRaw.replace(/[\s\-]/g, ''); // Limpio para consultas

  const handleInputChange = (e: any) => {
    const val = e.target.value;
    if (/[\s\-]/.test(val)) setErrorInput("Por favor, ingrese los números sin guiones ni espacios.");
    else setErrorInput("");
    setDocumentoRaw(val);
  };

  const consultarBCRA = async () => {
    setStatusBcra("procesando");
    try {
      const res = await fetch(`${urlBot}/api/consultar-bcra`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento, sexo })
      });
      const data = await res.json();
      if(data.success && !data.error) {
        setBcraData(data.bcra);
        if(data.bcra.nombre && !nombreCliente) setNombreCliente(data.bcra.nombre);
        setStatusBcra("completado");
      } else throw new Error();
    } catch { setStatusBcra("error"); }
  };

  const consultarJuicios = async () => {
    setStatusJuicios("procesando");
    try {
      const res = await fetch(`${urlBot}/api/consultar-juicios`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dni: documento })
      });
      const data = await res.json();
      if (data.success && !data.error) {
        setJuiciosData(data.judicial); setStatusJuicios("completado");
        if(data.judicial.registros?.length > 0 && !nombreCliente) setNombreCliente(data.judicial.registros[0].nombre);
      } else throw new Error();
    } catch { setStatusJuicios("error"); }
  };

  const consultarCupo = async () => {
    setStatusBot("procesando");
    try {
      const res = await fetch(`${urlBot}/api/simular-cupo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: documento, usuario: "Amarque", password: "uni66" })
      });
      const data = await res.json();
      if (data.error) setStatusBot("error");
      else if (data.noRegistra) setStatusBot("no_empleado");
      else if (data.success) {
        setCupoData({ maximo: data.cupoMaximo, iteraciones: data.iteraciones });
        setStatusBot("completado");
      }
    } catch { setStatusBot("error"); }
  };

  const consultarTodo = () => {
    if (documento.length < 7) return alert("Ingrese DNI o CUIL válido");
    setNombreCliente("");
    consultarBCRA(); consultarJuicios(); consultarCupo();
  };

  return (
    <div className="space-y-6">
      {/* BUSCADOR */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col md:flex-row gap-4 bg-[#0A0A0A] p-6 rounded-[32px] border border-gray-800">
          <input value={documentoRaw} onChange={handleInputChange} placeholder="DNI o CUIL" className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 font-mono text-lg" />
          <select value={sexo} onChange={(e) => setSexo(e.target.value)} className="bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold">
            <option value="M">MASCULINO</option><option value="F">FEMENINO</option>
          </select>
          <button onClick={consultarTodo} disabled={statusBot === "procesando"} className="bg-blue-600 hover:bg-blue-500 text-white px-10 rounded-2xl font-black flex items-center justify-center gap-2 uppercase transition-all disabled:opacity-50">
            <Search size={20}/> Evaluar
          </button>
        </div>
        {errorInput && <p className="text-red-500 text-sm font-bold ml-4 flex items-center gap-1"><AlertCircle size={14}/>{errorInput}</p>}
      </div>

      {/* TARJETA DE IDENTIDAD */}
      {nombreCliente && (
        <div className="bg-[#111] border border-blue-900/50 p-4 rounded-2xl flex items-center gap-4 animate-in fade-in">
           <div className="bg-blue-600/20 p-3 rounded-xl"><Search className="text-blue-500"/></div>
           <div>
             <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Identidad Detectada</p>
             <h2 className="text-xl font-black text-white uppercase">{nombreCliente}</h2>
           </div>
        </div>
      )}

      {/* TARJETAS DE SCORING */}
      {(statusBcra !== "idle" || statusBot !== "idle" || statusJuicios !== "idle") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* CUPO MENDOZA */}
          <div onClick={() => statusBot === "completado" && setModalActivo("cuad")} className={`bg-[#0A0A0A] border ${statusBot === "error" ? 'border-red-900' : 'border-gray-800'} rounded-[32px] p-6 relative ${statusBot === "completado" ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}>
            <div className="flex justify-between items-start mb-4">
               <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Briefcase size={14}/> Cupo Mendoza</h3>
               {statusBot === "error" && <button onClick={(e)=>{e.stopPropagation(); consultarCupo();}} className="bg-red-900/30 text-red-500 p-2 rounded-lg hover:bg-red-900/50"><RefreshCw size={14}/></button>}
            </div>
            {statusBot === "procesando" && <p className="text-blue-500 font-bold animate-pulse text-sm">Validando portal...</p>}
            {statusBot === "no_empleado" && <p className="text-orange-500 font-bold text-sm italic">No registra legajo</p>}
            {statusBot === "error" && <p className="text-red-500 font-bold text-sm flex flex-col gap-1"><AlertTriangle size={16}/> PROVEEDOR CON PROBLEMAS</p>}
            {statusBot === "completado" && cupoData && (
              <div>
                <p className="text-4xl font-black text-white font-mono">${cupoData.maximo.toLocaleString('es-AR')}</p>
              </div>
            )}
          </div>

          {/* BCRA */}
          <div onClick={() => statusBcra === "completado" && setModalActivo("bcra")} className={`bg-[#0A0A0A] border ${statusBcra === "error" ? 'border-red-900' : 'border-gray-800'} rounded-[32px] p-6 relative ${statusBcra === "completado" ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Landmark size={14}/> Situación BCRA</h3>
              {statusBcra === "error" && <button onClick={(e)=>{e.stopPropagation(); consultarBCRA();}} className="bg-red-900/30 text-red-500 p-2 rounded-lg hover:bg-red-900/50"><RefreshCw size={14}/></button>}
            </div>
            {statusBcra === "procesando" && <p className="text-blue-500 font-bold animate-pulse text-sm">Consultando...</p>}
            {statusBcra === "error" && <p className="text-red-500 font-bold text-sm flex flex-col gap-1"><AlertTriangle size={16}/> PROVEEDOR CON PROBLEMAS</p>}
            {statusBcra === "completado" && bcraData && (
              bcraData.tieneDeudas ? <p className="text-2xl font-black text-white uppercase">SITUACIÓN {bcraData.peorSituacion}</p> : <p className="text-green-500 font-bold italic">SITUACIÓN 1 - LIMPIO</p>
            )}
          </div>

          {/* JUICIOS */}
          <div onClick={() => statusJuicios === "completado" && juiciosData?.tieneRegistros && setModalActivo("juicios")} className={`bg-[#0A0A0A] border ${statusJuicios === "error" ? 'border-red-900' : 'border-gray-800'} rounded-[32px] p-6 relative ${statusJuicios === "completado" && juiciosData?.tieneRegistros ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Gavel size={14}/> Concursos / Quiebras</h3>
              {statusJuicios === "error" && <button onClick={(e)=>{e.stopPropagation(); consultarJuicios();}} className="bg-red-900/30 text-red-500 p-2 rounded-lg hover:bg-red-900/50"><RefreshCw size={14}/></button>}
            </div>
            {statusJuicios === "procesando" && <p className="text-blue-500 font-bold animate-pulse text-sm">Buscando expedientes...</p>}
            {statusJuicios === "error" && <p className="text-red-500 font-bold text-sm flex flex-col gap-1"><AlertTriangle size={16}/> PROVEEDOR CON PROBLEMAS</p>}
            {statusJuicios === "completado" && juiciosData && (
              juiciosData.tieneRegistros ? 
                <p className="text-red-500 font-black italic uppercase flex flex-col">REGISTROS ACTIVOS <span className="text-xs font-mono">({juiciosData.registros[0].tipo})</span></p> : 
                <p className="text-green-500 font-bold italic uppercase">Sin Registros</p>
            )}
          </div>

        </div>
      )}

      {/* MODALES DETALLADOS */}
      {modalActivo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setModalActivo(null)}>
          <div className="bg-[#111] border border-gray-800 rounded-[32px] p-8 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalActivo(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X size={24}/></button>
            
            {/* Modal BCRA */}
            {modalActivo === 'bcra' && bcraData && (
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

            {/* Modal Juicios */}
            {modalActivo === 'juicios' && juiciosData && (
              <>
                <h2 className="text-2xl font-black text-white mb-6 uppercase flex items-center gap-2"><Gavel/> Detalle Judicial</h2>
                <div className="space-y-4">
                  {juiciosData.registros.map((reg:any, i:number) => (
                    <div key={i} className="bg-black p-5 rounded-xl border border-gray-800">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><p className="text-gray-500 text-xs font-bold uppercase">Expediente</p><p className="text-white font-mono">{reg.expediente}</p></div>
                        <div><p className="text-gray-500 text-xs font-bold uppercase">Tipo</p><p className="text-red-500 font-bold uppercase">{reg.tipo}</p></div>
                        <div><p className="text-gray-500 text-xs font-bold uppercase">Fecha de Inicio</p><p className="text-white">{reg.fecha}</p></div>
                        <div><p className="text-gray-500 text-xs font-bold uppercase">Razón Social</p><p className="text-white text-sm">{reg.nombre}</p></div>
                      </div>
                      <button onClick={() => alert(`Tribunal Asignado:\n${reg.tribunal}\n\n(Aquí se integrará la descarga del PDF judicial)`)} className="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                        <FileText size={18}/> Ver Certificado / Tribunal
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
