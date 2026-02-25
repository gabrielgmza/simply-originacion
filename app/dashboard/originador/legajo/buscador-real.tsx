"use client";
import { useState } from "react";
import { Search, Gavel, ShieldCheck, ExternalLink } from "lucide-react";

export default function BuscadorScoringReal() {
  const [dni, setDni] = useState("");
  const [apellido, setApellido] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const consultarScoring = async () => {
    if (!dni || !apellido) {
      alert("Ingrese DNI y Apellido para cruzar datos.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, apellido })
      });
      
      const data = await res.json();
      setResultado(data);
    } catch (error) {
      console.error("Error de conexión:", error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <input 
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          placeholder="DNI Cliente..." 
          className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500"
        />
        <input 
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          placeholder="Apellido (Para validar JUS)..." 
          className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500"
        />
        <button 
          onClick={consultarScoring}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white px-8 rounded-2xl font-black flex items-center gap-2 transition-all"
        >
          {loading ? "EXTRAYENDO DATA..." : <><Search size={20}/> AUDITAR REAL</>}
        </button>
      </div>

      {/* RESULTADO JUDICIAL */}
      {resultado?.judicial && (
        <div className="animate-in slide-in-from-top-4 duration-500 mt-8">
          {resultado.judicial.tieneRegistros ? (
            <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-[40px] space-y-4">
              <div className="flex items-center gap-3 text-red-500 font-black italic text-xl">
                <Gavel size={28}/> QUIEBRA/CONCURSO DETECTADO
              </div>
              <p className="text-white text-sm">Validado contra el apellido: <strong>{resultado.apellidoValidado.toUpperCase()}</strong></p>
              
              <div className="grid grid-cols-1 gap-4 mt-4">
                {resultado.judicial.procesos.map((proc: any, idx: number) => (
                  <div key={idx} className="bg-black/40 p-5 rounded-3xl border border-red-500/20 flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><p className="text-gray-500 text-[10px] uppercase font-black">Expediente</p><p className="text-white font-bold">{proc.expediente}</p></div>
                      <div><p className="text-gray-500 text-[10px] uppercase font-black">Tipo - Fecha Inicio</p><p className="text-red-500 font-black">{proc.tipo} ({proc.fechaInicio})</p></div>
                      <div><p className="text-gray-500 text-[10px] uppercase font-black">Carátula</p><p className="text-white font-bold text-xs truncate">{proc.caratula}</p></div>
                    </div>
                    
                    {/* BOTÓN DE ENLACE AL DOCUMENTO */}
                    {proc.linkDocumento && (
                      <div className="pt-4 border-t border-red-500/10">
                        <a 
                          href={proc.linkDocumento} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-red-600 hover:bg-red-500 text-white py-3 px-6 rounded-xl text-xs font-black flex items-center justify-center gap-2 w-max transition-all"
                        >
                          <ExternalLink size={16} />
                          VER DOCUMENTO OFICIAL
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/50 p-6 rounded-3xl flex items-center gap-4 text-green-500 font-black italic">
              <ShieldCheck size={24}/> SIN REGISTROS JUDICIALES EN MENDOZA
            </div>
          )}
        </div>
      )}
    </div>
  );
}
