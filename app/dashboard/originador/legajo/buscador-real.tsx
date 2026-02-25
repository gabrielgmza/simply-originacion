"use client";
import { useState } from "react";
import { Search, Gavel, ShieldCheck, ExternalLink, Landmark, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

export default function BuscadorScoringReal() {
  const [dni, setDni] = useState("");
  const [apellido, setApellido] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const consultarScoring = async () => {
    if (!dni || !apellido) { alert("Ingrese DNI y Apellido."); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/scoring', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dni, apellido })
      });
      const data = await res.json();
      setResultado(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI Cliente..." className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" />
        <input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido (Para cruce JUS)..." className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" />
        <button onClick={consultarScoring} disabled={loading} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white px-8 rounded-2xl font-black flex items-center gap-2 transition-all">
          {loading ? "AUDITANDO..." : <><Search size={20}/> AUDITAR REAL</>}
        </button>
      </div>

      {resultado && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* ================= MODULO BCRA ================= */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-[40px] p-8 flex flex-col">
            <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] mb-6 flex items-center gap-2">
              <Landmark size={14}/> Central de Deudores BCRA
            </h3>
            
            {resultado.bcra?.tieneDeudas ? (
              <div className={`flex-1 rounded-3xl p-6 border ${resultado.bcra.peorSituacion > 2 ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500'}`}>
                <div className="flex items-center gap-3 font-black italic text-xl mb-4">
                  {resultado.bcra.peorSituacion > 2 ? <XCircle size={28}/> : <AlertTriangle size={28}/>}
                  SITUACIÓN MÁXIMA: {resultado.bcra.peorSituacion}
                </div>
                <p className="text-white text-3xl font-black mb-6">${(resultado.bcra.totalDeuda * 1000).toLocaleString('es-AR')} <span className="text-sm font-normal text-gray-500">Deuda Total Aprox.</span></p>
                <div className="space-y-2">
                  {resultado.bcra.entidades.map((ent: any, idx: number) => (
                    <div key={idx} className="bg-black/40 p-3 rounded-xl flex justify-between items-center border border-white/5 text-sm">
                      <span className="text-white font-bold truncate pr-4">{ent.nombre}</span>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-[10px] font-black mr-3 ${ent.situacion > 2 ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}>SIT {ent.situacion}</span>
                        <span className="text-gray-400 font-mono">${(ent.monto * 1000).toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-green-500/10 border border-green-500/50 p-6 rounded-3xl flex items-center gap-4 text-green-500 font-black italic">
                <CheckCircle size={28}/> SIN DEUDAS REGISTRADAS EN BCRA
              </div>
            )}
          </div>

          {/* ================= MODULO JUDICIAL ================= */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-[40px] p-8 flex flex-col">
            <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] mb-6 flex items-center gap-2">
              <Gavel size={14}/> Registro Judicial Mendoza
            </h3>
            
            {resultado.judicial?.tieneRegistros ? (
              <div className="flex-1 bg-red-500/10 border border-red-500/50 p-6 rounded-3xl text-red-500">
                <div className="flex items-center gap-3 font-black italic text-xl mb-4">
                  <Gavel size={28}/> PROCESOS DETECTADOS
                </div>
                <div className="space-y-4">
                  {resultado.judicial.procesos.map((proc: any, idx: number) => (
                    <div key={idx} className="bg-black/40 p-4 rounded-2xl border border-red-500/20 text-sm">
                      <p className="text-gray-400 text-[10px] uppercase font-black">{proc.expediente} • {proc.tipo}</p>
                      <p className="text-white font-bold truncate mb-3">{proc.caratula}</p>
                      {proc.linkDocumento && (
                        <a href={proc.linkDocumento} target="_blank" className="bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded-lg text-[10px] font-black flex items-center w-max gap-2 transition-all">
                          <ExternalLink size={14} /> VER DOCUMENTO
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-green-500/10 border border-green-500/50 p-6 rounded-3xl flex items-center gap-4 text-green-500 font-black italic">
                <ShieldCheck size={28}/> SIN REGISTROS (CONCURSO/QUIEBRA)
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
