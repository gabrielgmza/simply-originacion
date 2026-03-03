"use client";
// app/dashboard/configuracion/simulador/page.tsx
// La entidad configura los parámetros del simulador público y el scoring de pre-aprobación
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Save, Loader2, CheckCircle2, ExternalLink, Copy, Sliders, Target, FileText } from "lucide-react";

export default function ConfigSimuladorPage() {
  const { entidadData } = useAuth();
  const color = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [guardando, setGuardando] = useState(false);
  const [guardado,  setGuardado]  = useState(false);
  const [copiado,   setCopiado]   = useState(false);

  const [sim, setSim] = useState({
    montoMin:       50000,
    montoMax:       500000,
    cuotasOpciones: [6, 12, 18, 24],
    tagline:        "Créditos simples y rápidos",
    subtitulo:      "Simulá tu crédito sin compromisos",
    beneficios:     ["Acreditación en 24hs", "Sin garantes", "100% digital"],
  });

  const [sc, setSc] = useState({
    bcraMaxSituacion:   2,
    accionBcraExcedido: "OBSERVADO",
    mensajeAprobado:    "¡Felicitaciones! Tenés una pre-aprobación.",
    mensajeObservado:   "Tu solicitud requiere revisión de un asesor.",
    mensajeRechazo:     "En este momento no podemos continuar con tu solicitud.",
  });

  const [slug, setSlug] = useState("");

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      const snap = await getDoc(doc(db, "entidades", entidadData.id));
      const d    = snap.data() as any;
      if (d?.simuladorPublico) setSim({ ...sim, ...d.simuladorPublico });
      if (d?.scoringPublico)   setSc({ ...sc,  ...d.scoringPublico   });
      if (d?.slug) setSlug(d.slug);
    };
    cargar();
  }, [entidadData]);

  const urlPublica = slug
    ? `${typeof window !== "undefined" ? window.location.origin : "https://app.paysur.com"}/simular/${slug}`
    : "";

  const copiar = () => {
    if (!urlPublica) return;
    navigator.clipboard.writeText(urlPublica);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const guardar = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        simuladorPublico: sim,
        scoringPublico:   sc,
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } finally { setGuardando(false); }
  };

  const Input = ({ label, value, onChange, type = "text", placeholder = "" }: any) => (
    <div>
      <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gray-600"/>
    </div>
  );

  const cuotasDisp = [3,6,9,12,18,24,36,48];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Sliders size={20} style={{ color }}/> Simulador público
        </h1>
        <p className="text-gray-500 text-sm mt-1">Configurá la landing de captación de leads de tu entidad.</p>
      </div>

      {/* URL pública */}
      {urlPublica && (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-3">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">URL pública</p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-900/50 border border-gray-800">
            <p className="text-xs text-gray-400 font-mono flex-1 truncate">{urlPublica}</p>
            <div className="flex gap-1 shrink-0">
              <button onClick={copiar}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${copiado ? "text-green-400 bg-green-900/20" : "text-gray-400 hover:text-white border border-gray-700"}`}>
                {copiado ? <CheckCircle2 size={11}/> : <Copy size={11}/>}
                {copiado ? "Copiada" : "Copiar"}
              </button>
              <a href={urlPublica} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white border border-gray-700">
                <ExternalLink size={11}/> Ver
              </a>
            </div>
          </div>
          <p className="text-xs text-gray-600">Compartí este link en redes sociales, WhatsApp o tu sitio web.</p>
        </div>
      )}

      {!slug && (
        <div className="bg-yellow-900/10 border border-yellow-900/40 rounded-2xl p-4 text-sm text-yellow-400 flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠️</span>
          Tu entidad no tiene un slug configurado. Contactá a Paysur para activar tu URL pública (ej: /simular/mi-entidad).
        </div>
      )}

      {/* Textos y contenido */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText size={14} style={{ color }}/>
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Contenido</p>
        </div>
        <Input label="Tagline principal" value={sim.tagline}
          onChange={(v: string) => setSim(p => ({ ...p, tagline: v }))}
          placeholder="Créditos simples y rápidos"/>
        <Input label="Subtítulo" value={sim.subtitulo}
          onChange={(v: string) => setSim(p => ({ ...p, subtitulo: v }))}
          placeholder="Simulá tu crédito sin compromisos"/>
        <div>
          <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">
            Beneficios (uno por línea)
          </label>
          <textarea
            value={sim.beneficios.join("\n")}
            onChange={e => setSim(p => ({ ...p, beneficios: e.target.value.split("\n").filter(Boolean) }))}
            rows={3}
            className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gray-600 resize-none"/>
        </div>
      </div>

      {/* Parámetros del simulador */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders size={14} style={{ color }}/>
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Parámetros del simulador</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Monto mínimo ($)" type="number" value={sim.montoMin}
            onChange={(v: string) => setSim(p => ({ ...p, montoMin: parseInt(v) || 0 }))}/>
          <Input label="Monto máximo ($)" type="number" value={sim.montoMax}
            onChange={(v: string) => setSim(p => ({ ...p, montoMax: parseInt(v) || 0 }))}/>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-2">
            Opciones de cuotas disponibles
          </label>
          <div className="flex flex-wrap gap-2">
            {cuotasDisp.map(c => (
              <button key={c} type="button"
                onClick={() => setSim(p => ({
                  ...p,
                  cuotasOpciones: p.cuotasOpciones.includes(c)
                    ? p.cuotasOpciones.filter(x => x !== c)
                    : [...p.cuotasOpciones, c].sort((a,b) => a-b),
                }))}
                className="px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                style={{
                  background: sim.cuotasOpciones.includes(c) ? color : "#111",
                  color:      sim.cuotasOpciones.includes(c) ? "#fff" : "#666",
                  border:    `1px solid ${sim.cuotasOpciones.includes(c) ? color : "#1f2023"}`,
                }}>
                {c}m
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            La TNA y gastos se toman de los parámetros financieros de la entidad.
          </p>
        </div>
      </div>

      {/* Scoring / Pre-aprobación */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Target size={14} style={{ color }}/>
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Scoring y pre-aprobación</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">
              Situación BCRA máxima aceptada
            </label>
            <select value={sc.bcraMaxSituacion}
              onChange={e => setSc(p => ({ ...p, bcraMaxSituacion: parseInt(e.target.value) }))}
              className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
              {[1,2,3,4,5].map(n => (
                <option key={n} value={n}>
                  Situación {n} — {n===1?"Cumplimiento normal":n===2?"Riesgo bajo":n===3?"Riesgo medio":n===4?"Riesgo alto":"Irrecuperable"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">
              Acción si supera el límite
            </label>
            <select value={sc.accionBcraExcedido}
              onChange={e => setSc(p => ({ ...p, accionBcraExcedido: e.target.value }))}
              className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
              <option value="OBSERVADO">OBSERVADO — el vendedor evalúa</option>
              <option value="RECHAZADO">RECHAZADO — automático</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <p className="text-xs text-gray-600 uppercase font-bold tracking-widest">Mensajes al cliente</p>
          <Input label="Mensaje pre-aprobado" value={sc.mensajeAprobado}
            onChange={(v: string) => setSc(p => ({ ...p, mensajeAprobado: v }))}/>
          <Input label="Mensaje observado" value={sc.mensajeObservado}
            onChange={(v: string) => setSc(p => ({ ...p, mensajeObservado: v }))}/>
          <Input label="Mensaje rechazado" value={sc.mensajeRechazo}
            onChange={(v: string) => setSc(p => ({ ...p, mensajeRechazo: v }))}/>
        </div>
      </div>

      {/* Guardar */}
      <button onClick={guardar} disabled={guardando}
        className="w-full py-3.5 rounded-2xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110 transition-all"
        style={{ background: color }}>
        {guardando  ? <Loader2 size={15} className="animate-spin"/> :
         guardado   ? <><CheckCircle2 size={15}/> Guardado</> :
         <><Save size={15}/> Guardar configuración</>}
      </button>
    </div>
  );
}
