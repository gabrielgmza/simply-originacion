"use client";
// app/dashboard/revision/page.tsx
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Loader2, Shield, Clock, CheckCircle2, XCircle,
  ChevronRight, Filter, Save, Eye, AlertTriangle, Info
} from "lucide-react";
import { REGLAS_DEFAULT, type ReglasRevision } from "@/lib/revision/motor-fraude";

const BADGE: Record<string, { label: string; color: string; bg: string }> = {
  EN_REVISION:     { label: "Pendiente",   color: "text-yellow-400", bg: "bg-yellow-900/20" },
  PENDIENTE_DOCS:  { label: "Corrección",  color: "text-orange-400", bg: "bg-orange-900/20" },
  APROBADO:        { label: "Aprobado",    color: "text-green-400",  bg: "bg-green-900/20"  },
  RECHAZADO:       { label: "Rechazado",   color: "text-red-400",    bg: "bg-red-900/20"    },
};

export default function RevisionListaPage() {
  const { entidadData, userData } = useAuth();
  const router      = useRouter();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [ops,       setOps]       = useState<any[]>([]);
  const [cargando,  setCargando]  = useState(true);
  const [filtro,    setFiltro]    = useState("EN_REVISION");
  const [verConfig, setVerConfig] = useState(false);

  // Config de reglas
  const [reglas,    setReglas]    = useState<ReglasRevision>({ ...REGLAS_DEFAULT });
  const [guardando, setGuardando] = useState(false);
  const [okGuardado,setOkGuardado]= useState(false);

  const puedeEditar = ["GERENTE_GENERAL","MASTER_PAYSUR","LIQUIDADOR"].includes(userData?.rol || "");

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      setCargando(true);
      try {
        // Cargar reglas de la entidad
        const entSnap = await getDoc(doc(db, "entidades", entidadData.id));
        const saved = entSnap.data()?.configuracion?.revisionOnboarding;
        if (saved) setReglas(prev => ({ ...prev, ...saved }));

        // Cargar operaciones con documentación del onboarding
        const estados = filtro === "TODOS"
          ? ["EN_REVISION","PENDIENTE_DOCS","APROBADO","RECHAZADO"]
          : [filtro];

        const promesas = estados.map(estado =>
          getDocs(query(
            collection(db, "operaciones"),
            where("entidadId", "==", entidadData.id),
            where("estado",    "==", estado),
            orderBy("fechaActualizacion", "desc")
          ))
        );
        const snaps = await Promise.all(promesas);
        const lista: any[] = [];
        snaps.forEach(snap => snap.docs.forEach(d => {
          // Solo las que tienen legajo de onboarding
          const data = d.data();
          if (data.legajo?.selfieUrl || data.legajo?.dniFrenteUrl)
            lista.push({ id: d.id, ...data });
        }));
        setOps(lista);
      } finally { setCargando(false); }
    };
    cargar();
  }, [entidadData, filtro]);

  const guardarReglas = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.revisionOnboarding": reglas,
      });
      setOkGuardado(true);
      setTimeout(() => setOkGuardado(false), 3000);
    } finally { setGuardando(false); }
  };

  const setRegla = (key: keyof ReglasRevision, value: any) =>
    setReglas(prev => ({ ...prev, [key]: value }));

  const Toggle = ({ k, label, desc }: { k: keyof ReglasRevision; label: string; desc?: string }) => (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        {desc && <p className="text-[10px] text-gray-600 mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => puedeEditar && setRegla(k, !reglas[k])}
        className={`w-10 h-5 rounded-full transition-all relative shrink-0 mt-0.5 ${reglas[k] ? "" : "bg-gray-700"}`}
        style={{ backgroundColor: (reglas[k] as boolean) ? colorPrimario : "" }}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${reglas[k] ? "left-5" : "left-0.5"}`}/>
      </button>
    </div>
  );

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Revisión de Onboarding</h1>
          <p className="text-gray-500 text-sm mt-0.5">{ops.length} operaciones</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setVerConfig(!verConfig)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${verConfig ? "text-white border-gray-600 bg-gray-800" : "text-gray-400 border-gray-800 hover:text-white"}`}>
            <Shield size={14}/> Reglas automáticas
          </button>
        </div>
      </div>

      {/* Config de reglas (expandible) */}
      {verConfig && (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Configuración del motor de revisión</p>
            {puedeEditar && (
              <button onClick={guardarReglas} disabled={guardando}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: colorPrimario }}>
                {guardando ? <Loader2 size={13} className="animate-spin"/> : okGuardado ? <CheckCircle2 size={13}/> : <Save size={13}/>}
                {okGuardado ? "Guardado" : "Guardar"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Validaciones locales */}
            <div className="space-y-4">
              <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Validaciones automáticas (locales)</p>
              <Toggle k="validarImagenesPresentes"    label="Imágenes presentes"      desc="DNI frente, dorso y selfie"/>
              <Toggle k="validarLiveness"             label="Detección de vida"        desc="Liveness aprobado en el onboarding"/>
              <Toggle k="validarFirmaPresente"        label="Firma digital"            desc="Firma manuscrita del titular"/>
              <Toggle k="validarGeolocacion"          label="Geolocalización"          desc="Ubicación del cliente al completar"/>
              <Toggle k="validarCamposExtraCompletos" label="Campos adicionales"       desc="Campos requeridos completados"/>
            </div>

            {/* Vision API */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Google Cloud Vision</p>
                <span className="text-[10px] text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full font-bold">API externa</span>
              </div>
              <Toggle k="visionActivo"            label="Activar Vision API"        desc="Requiere API Key en configuración"/>
              <Toggle k="visionOcrDni"            label="OCR — Leer DNI"            desc="Extraer y comparar datos del DNI"/>
              <Toggle k="visionDetectarFotocopia" label="Detectar fotocopias"       desc="Safe Search para documentos"/>
              <Toggle k="visionCompararRostros"   label="Detectar rostro"           desc="Verificar selfie con 1 rostro"/>
            </div>
          </div>

          {/* Umbrales */}
          <div className="border-t border-gray-800 pt-4 grid grid-cols-2 gap-4">
            {[
              { key: "umbralAutoAprobacion", label: "Umbral auto-aprobación", desc: "% checks OK para aprobar automáticamente", color: "text-green-400" },
              { key: "umbralAutoRechazo",    label: "Umbral auto-rechazo",    desc: "Por debajo de este % → rechaza automáticamente", color: "text-red-400" },
            ].map(u => (
              <div key={u.key}>
                <p className={`text-sm font-bold mb-1 ${u.color}`}>{u.label}</p>
                <p className="text-[10px] text-gray-600 mb-2">{u.desc}</p>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={100} step={5}
                    value={(reglas as any)[u.key]}
                    onChange={e => setRegla(u.key as any, parseInt(e.target.value))}
                    disabled={!puedeEditar}
                    className="flex-1"/>
                  <span className={`text-sm font-black w-10 text-right ${u.color}`}>{(reglas as any)[u.key]}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-900/40 rounded-xl p-3">
            <Info size={12} className="shrink-0 mt-0.5 text-blue-400"/>
            Entre los dos umbrales el sistema marca la operación como "Revisión manual" para que un operador tome la decisión final.
          </div>
        </div>
      )}

      {/* Filtro */}
      <div className="flex gap-2 flex-wrap">
        {["EN_REVISION","PENDIENTE_DOCS","APROBADO","RECHAZADO","TODOS"].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filtro === f ? "text-white border-transparent" : "text-gray-500 border-gray-800 hover:text-white"}`}
            style={filtro === f ? { backgroundColor: colorPrimario } : {}}>
            {f === "TODOS" ? "Todos" : BADGE[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-600" size={24}/></div>
      ) : ops.length === 0 ? (
        <div className="bg-[#0A0A0A] border border-dashed border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-600">No hay operaciones en este estado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ops.map(op => {
            const badge  = BADGE[op.estado] || { label: op.estado, color: "text-gray-400", bg: "bg-gray-900/20" };
            const score  = op.revision?.scoreValidacion;
            const scoreC = score == null ? "text-gray-600" : score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
            return (
              <div key={op.id}
                onClick={() => router.push(`/dashboard/revision/${op.id}`)}
                className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-gray-600 transition-all group">

                {/* Miniatura selfie */}
                {op.legajo?.selfieUrl ? (
                  <img src={op.legajo.selfieUrl} className="w-12 h-12 rounded-xl object-cover border border-gray-700 shrink-0"/>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center shrink-0">
                    <Eye size={16} className="text-gray-600"/>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{op.cliente?.nombre || "—"}</p>
                  <p className="text-xs text-gray-500">DNI {op.cliente?.dni} — {op.tipo}</p>
                </div>

                {score != null && (
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black ${scoreC}`}>{score}</p>
                    <p className="text-[10px] text-gray-600">score</p>
                  </div>
                )}

                <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${badge.color} ${badge.bg}`}>
                  {badge.label}
                </span>

                <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors shrink-0"/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
