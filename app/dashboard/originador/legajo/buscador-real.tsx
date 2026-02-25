"use client";
import { useState, useEffect } from "react";
import { Search, Gavel, ShieldCheck, Landmark, CheckCircle, UserCheck, AlertTriangle, XCircle, Briefcase } from "lucide-react";
import { evaluarPerfilDinamico } from "@/lib/scoring/motor-decision";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

export default function BuscadorScoringReal() {
  const [dni, setDni] = useState("");
  const [sexo, setSexo] = useState("M");
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [politica, setPolitica] = useState<any>(null);

  // Cargamos la política de riesgo de la Entidad desde Firebase al iniciar
  useEffect(() => {
    const cargarPolitica = async () => {
      try {
        // En producción real, se filtra por la entidad logueada
        const q = query(collection(db, "politicas_riesgo"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPolitica(snap.docs[0].data());
        } else {
          // Si la entidad no configuró nada, usamos valores por defecto
          setPolitica({
            bcraMaximoPermitido: 2,
            accionBcraExcedido: "OBSERVADO",
            rechazarQuiebrasVigentes: true,
            exigeEmpleadoPublico: false,
            cupoMinimoRequerido: 0
          });
        }
      } catch (e) { console.error("Error cargando política:", e); }
    };
    cargarPolitica();
  }, []);

  const consultarScoring = async () => {
    if (!dni || dni.length < 7) { alert("Ingrese un DNI válido."); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/scoring', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dni, sexo })
      });
      const data = await res.json();
      
      // Simulamos la respuesta de la API de Empleo (NOSIS/SIDICO) por ahora
      data.empleo = { esEmpleadoPublico: true, cupoDisponible: 250000, reparticion: "DGE MENDOZA" };
      
      setResultado(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const perfil = resultado && politica ? evaluarPerfilDinamico(resultado, politica) : null;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 bg-[#0A0A0A] p-6 rounded-[32px] border border-gray-800">
        <input 
          value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} maxLength={8}
          placeholder="Nº de Documento" 
          className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 text-lg font-mono" 
        />
        <select value={sexo} onChange={(e) => setSexo(e.target.value)} className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 font-bold w-48">
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
        <button onClick={consultarScoring} disabled={loading || !politica} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white px-10 rounded-2xl font-black flex items-center gap-2 transition-all uppercase">
          {loading ? "PROCESANDO..." : <><Search size={20}/> EVALUAR PERFIL</>}
        </button>
      </div>

      {resultado && perfil && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 mt-10">
          
          {/* VEREDICTO DE LA ENTIDAD */}
          <div className={`${perfil.color} p-8 rounded-[32px] shadow-2xl flex flex-col gap-4 border border-white/10`}>
            <div className="flex items-center gap-4 text-white">
              <UserCheck size={36} />
              <div>
                <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-80">Decisión del Motor (Políticas Propias)</p>
                <h2 className="text-3xl font-black italic uppercase">{perfil.estado}</h2>
              </div>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <ul className="space-y-2">
                {perfil.motivos.map((motivo: string, idx: number) => (
                  <li key={idx} className="text-white text-sm font-bold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div> {motivo}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* DATOS LABORALES (Conector) */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6">
              <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2"><Briefcase size={14}/> Laboral & Cupo</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">Tipo: <span className="text-white font-bold">{resultado.empleo.esEmpleadoPublico ? "EMPLEADO PÚBLICO" : "PRIVADO"}</span></p>
                <p className="text-gray-400">Repartición: <span className="text-white font-bold">{resultado.empleo.reparticion}</span></p>
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-blue-500 text-[10px] uppercase font-black">Cupo Disponible Aprox.</p>
                  <p className="text-white font-mono text-xl">${resultado.empleo.cupoDisponible.toLocaleString('es-AR')}</p>
                </div>
              </div>
            </div>

            {/* BCRA RESUMEN */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6">
              <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2"><Landmark size={14}/> BCRA</h3>
              {resultado.bcra?.tieneDeudas ? (
                <div>
                  <p className="text-gray-400 text-sm">Peor Sit: <span className="text-white font-bold text-lg">{resultado.bcra.peorSituacion}</span></p>
                  <p className="text-gray-400 text-sm mt-2">Deuda Total: <span className="text-white font-mono">${(resultado.bcra.totalDeuda * 1000).toLocaleString('es-AR')}</span></p>
                </div>
              ) : ( <p className="text-green-500 font-bold text-sm">Sin deudas registradas.</p> )}
            </div>

            {/* JUS MENDOZA RESUMEN */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6">
              <h3 className="text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2"><Gavel size={14}/> Jus Mendoza</h3>
              {resultado.judicial?.tieneRegistros ? (
                <div className="text-red-500">
                  <p className="font-bold text-sm">{resultado.judicial.procesos.length} Proceso/s encontrado/s.</p>
                  <p className="text-[10px] uppercase mt-2">Revisar detalle en expediente.</p>
                </div>
              ) : ( <p className="text-green-500 font-bold text-sm">Sin procesos vigentes.</p> )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
