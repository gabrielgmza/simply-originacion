"use client";
// app/dashboard/configuracion/scoring/page.tsx
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { CONFIG_SCORING_DEFAULT, calcularScoring } from "@/lib/scoring/motor";
import { colorDecision } from "@/lib/scoring/motor";
import { Save, Loader2, CheckCircle2, TrendingUp, AlertTriangle, Info } from "lucide-react";

type PesoKey = "pesoEdad" | "pesoAntiguedadLaboral" | "pesoIngresos" | "pesoEstadoCivil" | "pesoBcra" | "pesoComportamiento";

const PESOS_INFO: { key: PesoKey; label: string; desc: string }[] = [
  { key: "pesoEdad",              label: "Edad",                  desc: "Edad del solicitante (rango óptimo configurable)" },
  { key: "pesoAntiguedadLaboral", label: "Antigüedad laboral",    desc: "Meses en el empleo actual" },
  { key: "pesoIngresos",          label: "Ingresos",              desc: "Ingreso mensual vs. referencia" },
  { key: "pesoEstadoCivil",       label: "Estado civil",          desc: "Casado > Unión libre > Soltero" },
  { key: "pesoBcra",              label: "BCRA",                  desc: "Situación crediticia actual e histórica" },
  { key: "pesoComportamiento",    label: "Comportamiento interno", desc: "Historial de pagos en esta entidad" },
];

export default function ConfigScoringPage() {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [config, setConfig] = useState({ ...CONFIG_SCORING_DEFAULT });
  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ok,        setOk]        = useState(false);

  // Preview del scoring con datos de ejemplo
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      try {
        const snap = await getDoc(doc(db, "entidades", entidadData.id));
        const saved = snap.data()?.configuracion?.scoring;
        if (saved) setConfig(prev => ({ ...prev, ...saved }));
      } finally { setCargando(false); }
    };
    cargar();
  }, [entidadData]);

  // Recalcular preview al cambiar config
  useEffect(() => {
    const resultado = calcularScoring({
      fechaNacimiento:       "1985-06-15",
      antiguedadMeses:       36,
      ingresoMensual:        150_000,
      estadoCivil:           "CASADO",
      situacionBcraActual:   1,
      peorSituacionHistorica:1,
      opsPreviasEntidad:     2,
      pagosPuntuales:        23,
      cuotasTotalesPrevias:  24,
      moraPrevia:            false,
    }, config);
    setPreview(resultado);
  }, [config]);

  const sumaPesos = PESOS_INFO.reduce((a, p) => a + (config[p.key] || 0), 0);
  const pesosOk   = sumaPesos === 100;

  const set = (key: string, value: number | string) => {
    setConfig(prev => ({ ...prev, [key]: typeof value === "string" ? parseFloat(value) || 0 : value }));
  };

  const guardar = async () => {
    if (!entidadData?.id) return;
    if (!pesosOk) { alert("Los pesos deben sumar exactamente 100%."); return; }
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.scoring": config,
      });
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (e) { alert("Error al guardar."); }
    finally { setGuardando(false); }
  };

  const puedeEditar = ["GERENTE_GENERAL", "MASTER_PAYSUR"].includes(userData?.rol || "");

  if (cargando) return (
    <div className="flex justify-center py-32"><Loader2 className="animate-spin text-gray-600" size={24}/></div>
  );

  const coloresPreview = preview ? colorDecision(preview.decision) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Scoring Crediticio</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configurá los pesos y umbrales del motor de decisión</p>
        </div>
        {puedeEditar && (
          <button onClick={guardar} disabled={guardando || !pesosOk}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-40"
            style={{ backgroundColor: colorPrimario }}>
            {guardando ? <Loader2 size={14} className="animate-spin"/> : ok ? <CheckCircle2 size={14}/> : <Save size={14}/>}
            {ok ? "Guardado" : "Guardar"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── PESOS ── */}
        <div className="space-y-4">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Pesos de variables</p>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${pesosOk ? "text-green-400 bg-green-900/20" : "text-orange-400 bg-orange-900/20"}`}>
                {sumaPesos}% / 100%
              </span>
            </div>

            <div className="space-y-4">
              {PESOS_INFO.map(p => (
                <div key={p.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-white">{p.label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={0} max={100} step={5}
                        value={config[p.key]}
                        onChange={e => set(p.key, e.target.value)}
                        disabled={!puedeEditar}
                        className="w-16 bg-[#111] border border-gray-700 rounded-lg px-2 py-1 text-white text-sm text-right focus:outline-none disabled:opacity-50"/>
                      <span className="text-gray-500 text-xs w-4">%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${config[p.key]}%`, backgroundColor: colorPrimario }}/>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">{p.desc}</p>
                </div>
              ))}
            </div>

            {!pesosOk && (
              <div className="mt-3 flex items-start gap-2 text-xs text-orange-400 bg-orange-900/10 rounded-xl p-3">
                <AlertTriangle size={12} className="shrink-0 mt-0.5"/>
                Los pesos deben sumar 100%. Actualmente suman {sumaPesos}%.
              </div>
            )}
          </div>

          {/* ── UMBRALES ── */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Umbrales de decisión</p>

            <div className="space-y-4">
              {[
                { key: "umbralAprobado", label: "Puntaje mínimo APROBADO", color: "text-green-400",  desc: "Mayor o igual → aprobación automática" },
                { key: "umbralRevision", label: "Puntaje mínimo REVISIÓN",  color: "text-yellow-400", desc: "Entre este y el anterior → revisión manual" },
              ].map(u => (
                <div key={u.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-sm font-bold ${u.color}`}>{u.label}</label>
                    <input
                      type="number" min={0} max={1000} step={50}
                      value={(config as any)[u.key]}
                      onChange={e => set(u.key, e.target.value)}
                      disabled={!puedeEditar}
                      className="w-20 bg-[#111] border border-gray-700 rounded-lg px-2 py-1 text-white text-sm text-right focus:outline-none disabled:opacity-50"/>
                  </div>
                  <p className="text-[10px] text-gray-600">{u.desc}</p>
                </div>
              ))}
              <div className="text-xs text-gray-600 bg-gray-900/50 rounded-xl p-3">
                <span className="text-red-400 font-bold">RECHAZADO</span> → puntaje menor a {config.umbralRevision}
              </div>
            </div>
          </div>

          {/* ── PARÁMETROS DE REFERENCIA ── */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Parámetros de referencia</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "edadMinima",    label: "Edad mínima apta",   suffix: "años"  },
                { key: "edadMaxima",    label: "Edad máxima óptima", suffix: "años"  },
                { key: "ingresosRef",   label: "Ingreso referencia",  suffix: "$/mes" },
                { key: "antiguedadRef", label: "Antigüedad máxima",  suffix: "meses" },
              ].map(r => (
                <div key={r.key}>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">{r.label}</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min={0}
                      value={(config as any)[r.key]}
                      onChange={e => set(r.key, e.target.value)}
                      disabled={!puedeEditar}
                      className="flex-1 bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none disabled:opacity-50"/>
                    <span className="text-[10px] text-gray-600 shrink-0">{r.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── PREVIEW EN TIEMPO REAL ── */}
        <div className="space-y-4">
          <div className={`bg-[#0A0A0A] border rounded-2xl p-5 ${coloresPreview?.border || "border-gray-800"}`}>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">
              Vista previa — perfil de ejemplo
            </p>
            <div className="text-xs text-gray-600 bg-gray-900/50 rounded-xl p-3 mb-4 space-y-1">
              <p>Edad: 38 años | Antigüedad: 36 meses</p>
              <p>Ingresos: $150,000 | Estado civil: Casado</p>
              <p>BCRA: Situación 1 | 2 créditos previos sin mora</p>
            </div>

            {preview && (
              <>
                <div className="text-center mb-4">
                  <p className={`text-6xl font-black ${coloresPreview?.text}`}>{preview.puntaje}</p>
                  <p className="text-gray-600 text-xs">de 1000 puntos</p>
                  <span className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-black ${coloresPreview?.bg} ${coloresPreview?.text} border ${coloresPreview?.border}`}>
                    {preview.decision}
                  </span>
                </div>

                <div className="space-y-2">
                  {preview.breakdown.map((b: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-28 shrink-0">{b.categoria}</span>
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${b.puntajeParcial}%` }}/>
                      </div>
                      <span className="text-[10px] text-gray-400 w-10 text-right">+{b.aporte.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Escala visual */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">Escala de decisión</p>
            <div className="relative h-6 rounded-full overflow-hidden flex">
              <div className="bg-red-900/60 flex items-center justify-center text-[9px] font-bold text-red-400"
                style={{ width: `${config.umbralRevision / 10}%` }}>
                {config.umbralRevision < 200 ? "" : "RECH."}
              </div>
              <div className="bg-yellow-900/60 flex items-center justify-center text-[9px] font-bold text-yellow-400"
                style={{ width: `${(config.umbralAprobado - config.umbralRevision) / 10}%` }}>
                {(config.umbralAprobado - config.umbralRevision) < 100 ? "" : "REVISIÓN"}
              </div>
              <div className="bg-green-900/60 flex-1 flex items-center justify-center text-[9px] font-bold text-green-400">
                APROBADO
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>0</span>
              <span>{config.umbralRevision}</span>
              <span>{config.umbralAprobado}</span>
              <span>1000</span>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 text-xs text-gray-500 flex items-start gap-2">
            <Info size={12} className="shrink-0 mt-0.5 text-blue-400"/>
            <p>El score se calcula al hacer clic en "Calcular score" desde el legajo del cliente o se puede recalcular en cualquier momento. Cada cálculo queda registrado en el historial.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
