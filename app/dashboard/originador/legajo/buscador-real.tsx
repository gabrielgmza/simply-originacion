"use client";
import { useState } from "react";
import { Search, Gavel, ShieldCheck, ExternalLink, Landmark, AlertTriangle, XCircle, CheckCircle, UserCheck } from "lucide-react";

export default function BuscadorScoringReal() {
  const [dni, setDni] = useState("");
  const [sexo, setSexo] = useState("M");
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const consultarScoring = async () => {
    if (!dni || dni.length < 7) { alert("Ingrese un DNI válido."); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/scoring', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dni, sexo })
      });
      const data = await res.json();
      setResultado(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Lógica de perfilado automático
  const generarPerfil = () => {
    if (!resultado) return null;
    const riesgoJudicial = resultado.judicial.tieneRegistros;
    const riesgoBcra = resultado.bcra.peorSituacion > 2;
    
    if (riesgoJudicial) return { estado: 'RECHAZADO', color: 'bg-red-600', texto: 'Riesgo Judicial Detectado (Quiebra/Concurso)' };
    if (riesgoBcra) return { estado: 'RIESGO ALTO', color: 'bg-yellow-600', texto: `Situación BCRA Alta (Nivel ${resultado.bcra.peorSituacion})` };
    return { estado: 'APROBADO', color: 'bg-green-600', texto: 'Perfil Limpio. Apto para cotización.' };
  };

  const perfil = generarPerfil();

  return (
    <div className="space-y-6">
      <div className="flex gap-4 bg-[#0A0A0A] p-6 rounded-[32px] border border-gray-800">
        <input 
          value={dni} 
          onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} 
          maxLength={8}
          placeholder="Nº de Documento" 
          className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 text-lg font-mono" 
        />
        <select 
          value={sexo} 
          onChange={(e) => setSexo(e.target.value)} 
          className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 font-bold w-48"
        >
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
        <button 
          onClick={consultarScoring} 
          disabled={loading} 
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white px-10 rounded-2xl font-black flex items-center gap-2 transition-all uppercase"
        >
          {loading ? "PROCESANDO..." : <><Search size={20}/> EVALUAR</>}
        </button>
      </div>

      {resultado && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 mt-10">
          
          {/* ================= PERFIL DE CRÉDITO GENERADO ================= */}
          <div className={`${perfil?.color} p-6 rounded-[32px] flex items-center justify-between shadow-2xl`}>
            <div className="flex items-center gap-4 text-white">
              <UserCheck size={32} />
              <div>
                <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-80">Veredicto del Sistema | CUIL: {resultado.cuilValidado}</p>
                <h2 className="text-2xl font-black italic uppercase">{perfil?.estado}</h2>
              </div>
            </div>
            <p className="text-white font-bold bg-black/20 px-6 py-3 rounded-2xl">{perfil?.texto}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MODULO BCRA */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-8">
              <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] mb-6 flex items-center gap-2">
                <Landmark size={14}/> Central de Deudores BCRA
              </h3>
              {resultado.bcra?.tieneDeudas ? (
                <div>
                  <div className="flex items-center gap-3 font-black text-xl mb-2 text-white">
                    SITUACIÓN MÁXIMA: <span className={resultado.bcra.peorSituacion > 2 ? 'text-red-500' : 'text-yellow-500'}>{resultado.bcra.peorSituacion}</span>
                  </div>
                  <p className="text-white text-3xl font-black mb-6">${(resultado.bcra.totalDeuda * 1000).toLocaleString('es-AR')} <span className="text-sm font-normal text-gray-500">Deuda Total Aprox.</span></p>
                  <div className="space-y-2">
                    {resultado.bcra.entidades.map((ent: any, idx: number) => (
                      <div key={idx} className="bg-black/40 p-3 rounded-xl flex justify-between items-center border border-white/5 text-sm">
                        <span className="text-white font-bold truncate pr-4">{ent.nombre}</span>
                        <div className="text-right flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-black ${ent.situacion > 2 ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}>SIT {ent.situacion}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-green-500 font-black italic flex items-center gap-3 bg-green-500/10 p-4 rounded-2xl"><CheckCircle size={20}/> SIN DEUDAS REGISTRADAS</div>
              )}
            </div>

            {/* MODULO JUDICIAL */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-8">
              <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] mb-6 flex items-center gap-2">
                <Gavel size={14}/> Registro Judicial Mendoza
              </h3>
              {resultado.judicial?.tieneRegistros ? (
                <div className="space-y-4">
                  {resultado.judicial.procesos.map((proc: any, idx: number) => (
                    <div key={idx} className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-sm">
                      <p className="text-red-500 text-[10px] uppercase font-black mb-1">{proc.tipo}</p>
                      <p className="text-white font-bold truncate mb-3">{proc.caratula}</p>
                      {proc.linkDocumento && (
                        <a href={proc.linkDocumento} target="_blank" className="bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded-lg text-[10px] font-black w-max flex gap-2"><ExternalLink size={14} /> VER EXPEDIENTE</a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-green-500 font-black italic flex items-center gap-3 bg-green-500/10 p-4 rounded-2xl"><ShieldCheck size={20}/> SIN CONCURSOS NI QUIEBRAS</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
