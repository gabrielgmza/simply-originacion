"use client";
// app/dashboard/revision/[id]/page.tsx
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, CheckCircle2, AlertTriangle, XCircle,
  Clock, ZoomIn, MapPin, Shield, RefreshCw,
  ThumbsUp, ThumbsDown, MessageSquare, ChevronLeft,
  Eye, Fingerprint, FileText, User
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const estadoCheck = (estado: string) => ({
  OK:      { icon: <CheckCircle2 size={14} className="text-green-400"/>, color: "text-green-400",  bg: "bg-green-900/20",  border: "border-green-900/40"  },
  FALLA:   { icon: <XCircle     size={14} className="text-red-400"/>,   color: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-900/40"    },
  MANUAL:  { icon: <Clock       size={14} className="text-yellow-400"/>,color: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-900/40" },
  OMITIDO: { icon: <Clock       size={14} className="text-gray-500"/>,  color: "text-gray-500",   bg: "bg-gray-900/20",   border: "border-gray-800"      },
})[estado] || { icon: null, color: "text-gray-500", bg: "bg-gray-900", border: "border-gray-800" };

// ── Componente ────────────────────────────────────────────────────────────────
export default function RevisionOnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params?.id as string;
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [op,          setOp]          = useState<any>(null);
  const [cargando,    setCargando]    = useState(true);
  const [analizando,  setAnalizando]  = useState(false);
  const [accionando,  setAccionando]  = useState(false);
  const [lightbox,    setLightbox]    = useState<string | null>(null);
  const [motivoModal, setMotivoModal] = useState<"APROBAR"|"RECHAZAR"|"PEDIR_CORRECCION"|null>(null);
  const [motivo,      setMotivo]      = useState("");

  // Cargar operación
  useEffect(() => {
    const cargar = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, "operaciones", id));
      if (snap.exists()) setOp({ id: snap.id, ...snap.data() });
      setCargando(false);
    };
    cargar();
  }, [id]);

  // Ejecutar análisis automático
  const ejecutarAnalisis = async () => {
    if (!op || !entidadData?.id) return;
    setAnalizando(true);
    try {
      const res = await fetch("/api/revision/onboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId:  op.id,
          entidadId:    entidadData.id,
          usuarioEmail: userData?.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Recargar operación con datos de revisión actualizados
        const snap = await getDoc(doc(db, "operaciones", op.id));
        if (snap.exists()) setOp({ id: snap.id, ...snap.data() });
      }
    } finally { setAnalizando(false); }
  };

  // Acción manual del operador
  const ejecutarAccion = async (accion: "APROBAR" | "RECHAZAR" | "PEDIR_CORRECCION") => {
    if (!op || !entidadData) return;
    setAccionando(true);
    try {
      const wsConf = entidadData.configuracion?.whatsapp || {};
      await fetch("/api/revision/onboarding", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId:   op.id,
          entidadId:     entidadData.id,
          accion,
          motivo,
          usuarioEmail:  userData?.email,
          telefonoCliente: op.cliente?.telefono,
          nombreCliente:   op.cliente?.nombre,
          entidadNombre:   entidadData.nombreFantasia,
          wsActivo:        wsConf.activo,
          wsAccessToken:   wsConf.accessToken,
          wsPhoneId:       wsConf.phoneNumberId,
        }),
      });
      setMotivoModal(null);
      setMotivo("");
      router.back();
    } finally { setAccionando(false); }
  };

  if (cargando) return (
    <div className="flex justify-center py-32"><Loader2 className="animate-spin text-gray-600" size={28}/></div>
  );
  if (!op) return (
    <div className="text-center py-32 text-gray-500">Operación no encontrada.</div>
  );

  const revision    = op.revision     || {};
  const legajo      = op.legajo       || {};
  const seguridad   = op.seguridad    || {};
  const camposExtra = legajo.camposExtra || {};
  const checks: any[] = revision.checks || [];
  const score       = revision.scoreValidacion ?? null;
  const geo         = seguridad.geolocacion;

  const scoreColor =
    score === null ? "text-gray-500" :
    score >= 80    ? "text-green-400" :
    score >= 50    ? "text-yellow-400" : "text-red-400";

  const decisionLabel: Record<string, { label: string; color: string }> = {
    APROBADO_AUTO:  { label: "Aprobado automáticamente", color: "text-green-400" },
    REVISION_MANUAL:{ label: "Requiere revisión manual",  color: "text-yellow-400" },
    RECHAZADO_AUTO: { label: "Rechazado automáticamente", color: "text-red-400"   },
  };

  const camposExtraEntidad: any[] = entidadData?.configuracion?.camposExtraOnboarding || [];

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-white transition-colors">
            <ChevronLeft size={20}/>
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Revisión de Onboarding</h1>
            <p className="text-gray-500 text-sm">{op.cliente?.nombre} — DNI {op.cliente?.dni}</p>
          </div>
        </div>

        {/* Score y decisión actual */}
        <div className="flex items-center gap-3">
          {score !== null && (
            <div className="text-right">
              <p className={`text-2xl font-black ${scoreColor}`}>{score}<span className="text-sm text-gray-600">/100</span></p>
              <p className={`text-xs font-bold ${decisionLabel[revision.decision]?.color || "text-gray-500"}`}>
                {decisionLabel[revision.decision]?.label || "Sin analizar"}
              </p>
            </div>
          )}
          <button onClick={ejecutarAnalisis} disabled={analizando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ backgroundColor: colorPrimario }}>
            {analizando ? <Loader2 size={14} className="animate-spin"/> : <Shield size={14}/>}
            {score !== null ? "Re-analizar" : "Analizar"}
          </button>
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Columna izquierda: imágenes ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Documentos — DNI + Selfie */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Documentación capturada</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "DNI Frente",   url: legajo.dniFrenteUrl, icon: <FileText size={14}/> },
                { label: "DNI Dorso",    url: legajo.dniDorsoUrl,  icon: <FileText size={14}/> },
                { label: "Selfie",       url: legajo.selfieUrl,    icon: <User     size={14}/> },
                { label: "Firma",        url: legajo.firmaUrl,     icon: <Eye      size={14}/> },
              ].map((item, i) => (
                <div key={i} className="relative group">
                  {item.url ? (
                    <>
                      <img src={item.url} alt={item.label}
                        className="w-full aspect-video object-cover rounded-xl border border-gray-800 cursor-zoom-in hover:border-gray-600 transition-all"
                        onClick={() => setLightbox(item.url!)}/>
                      <button onClick={() => setLightbox(item.url!)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                        <ZoomIn size={20} className="text-white"/>
                      </button>
                      <p className="text-[10px] text-gray-500 mt-1 text-center">{item.label}</p>
                    </>
                  ) : (
                    <div className="w-full aspect-video rounded-xl border border-dashed border-gray-700 flex flex-col items-center justify-center gap-1">
                      <div className="text-gray-700">{item.icon}</div>
                      <p className="text-[10px] text-gray-700">{item.label}</p>
                      <p className="text-[10px] text-red-500 font-bold">No recibida</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* OCR datos extraídos */}
          {revision.ocrDatos && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                <Fingerprint size={12}/> OCR — Datos extraídos del DNI
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Nombre extraído", value: revision.ocrDatos.nombreExtraido || "—" },
                  { label: "DNI extraído",    value: revision.ocrDatos.dniExtraido    || "—" },
                  { label: "Coincide legajo", value: revision.ocrDatos.coincideConLegajo ? "Sí ✓" : "No ✗" },
                ].map((r, i) => (
                  <div key={i} className="bg-gray-900/40 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">{r.label}</p>
                    <p className={`font-bold mt-0.5 ${r.label.includes("Coincide") && !r.value.includes("Sí") ? "text-red-400" : "text-white"}`}>{r.value}</p>
                  </div>
                ))}
              </div>
              {revision.ocrDatos.discrepancias?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {revision.ocrDatos.discrepancias.map((d: string, i: number) => (
                    <p key={i} className="text-xs text-red-400 flex items-start gap-1.5">
                      <AlertTriangle size={11} className="shrink-0 mt-0.5"/> {d}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Campos extra del cliente */}
          {camposExtraEntidad.length > 0 && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Campos adicionales</p>
              <div className="grid grid-cols-2 gap-3">
                {camposExtraEntidad.map((campo: any) => {
                  const valor = camposExtra[campo.id];
                  const esFoto = campo.tipo === "foto" || campo.tipo === "archivo";
                  return (
                    <div key={campo.id} className="bg-gray-900/40 rounded-xl p-3">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                        {campo.label}{campo.requerido && <span className="text-red-400 ml-1">*</span>}
                      </p>
                      {esFoto && valor ? (
                        <img src={valor} className="w-full h-20 object-cover rounded-lg border border-gray-800 cursor-zoom-in"
                          onClick={() => setLightbox(valor)}/>
                      ) : valor ? (
                        <p className="text-sm text-white font-medium">{valor}</p>
                      ) : (
                        <p className="text-xs text-red-400">No completado</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mapa de geolocalización */}
          {geo?.lat && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                <MapPin size={12}/> Geolocalización del cliente
              </p>
              <iframe
                src={`https://maps.google.com/maps?q=${geo.lat},${geo.lng}&z=14&output=embed`}
                className="w-full h-48 rounded-xl border border-gray-800"
                loading="lazy"
                title="Ubicación del cliente"/>
              <p className="text-[10px] text-gray-600 mt-2">
                Lat {geo.lat.toFixed(6)}, Lng {geo.lng.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* ── Columna derecha: checks + acciones ── */}
        <div className="space-y-4">

          {/* Resumen */}
          {revision.resumen && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Resumen</p>
              <p className="text-sm text-gray-300">{revision.resumen}</p>
              {revision.usóVision && (
                <p className="text-[10px] text-blue-400 mt-2 flex items-center gap-1">
                  <Shield size={10}/> Analizó con Google Cloud Vision
                </p>
              )}
            </div>
          )}

          {/* Checks */}
          {checks.length > 0 && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest px-4 py-3 border-b border-gray-800">
                Validaciones ({checks.filter((c: any) => c.estado === "OK").length}/{checks.length} OK)
              </p>
              <div className="divide-y divide-gray-900">
                {checks.map((check: any, i: number) => {
                  const s = estadoCheck(check.estado);
                  return (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3 ${s.bg}`}>
                      <div className="mt-0.5 shrink-0">{s.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-bold ${s.color}`}>{check.nombre}</p>
                          <span className="text-[10px] text-gray-600 shrink-0">+{check.peso}%</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{check.detalle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Datos técnicos de seguridad */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 space-y-2">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Datos de seguridad</p>
            {[
              { label: "Liveness",    value: seguridad.livenessAprobado ? "Aprobado ✓" : "No aprobado", ok: seguridad.livenessAprobado },
              { label: "Dispositivo", value: (seguridad.deviceFingerprint || "—").slice(0, 40) + "..." },
              { label: "Fecha",       value: seguridad.fechaOnboarding ? new Date(seguridad.fechaOnboarding).toLocaleString("es-AR") : "—" },
            ].map((r, i) => (
              <div key={i} className="flex justify-between items-start gap-2">
                <span className="text-[10px] text-gray-600 shrink-0">{r.label}</span>
                <span className={`text-[10px] font-bold text-right ${r.ok === false ? "text-red-400" : r.ok === true ? "text-green-400" : "text-gray-400"}`}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 space-y-2">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">Acción del operador</p>
            <button onClick={() => setMotivoModal("APROBAR")}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-900/30 border border-green-900/50 text-green-400 font-bold text-sm hover:bg-green-900/50 transition-all">
              <ThumbsUp size={15}/> Aprobar
            </button>
            <button onClick={() => setMotivoModal("PEDIR_CORRECCION")}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-yellow-900/30 border border-yellow-900/50 text-yellow-400 font-bold text-sm hover:bg-yellow-900/50 transition-all">
              <RefreshCw size={15}/> Pedir corrección
            </button>
            <button onClick={() => setMotivoModal("RECHAZAR")}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-900/30 border border-red-900/50 text-red-400 font-bold text-sm hover:bg-red-900/50 transition-all">
              <ThumbsDown size={15}/> Rechazar
            </button>
          </div>

        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Documento" className="max-w-full max-h-full rounded-2xl object-contain"
            onClick={e => e.stopPropagation()}/>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black">
            <XCircle size={24}/>
          </button>
        </div>
      )}

      {/* ── Modal motivo ── */}
      {motivoModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-gray-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <p className="font-black text-white text-lg">
              {motivoModal === "APROBAR"           ? "Confirmar aprobación" :
               motivoModal === "RECHAZAR"          ? "Confirmar rechazo" :
               "Pedir corrección"}
            </p>
            <p className="text-sm text-gray-400">
              {motivoModal === "PEDIR_CORRECCION"
                ? "Indicá qué debe corregir el cliente. Se le enviará un WhatsApp con este motivo."
                : motivoModal === "RECHAZAR"
                ? "Indicá el motivo del rechazo. Se notificará al cliente por WhatsApp."
                : "¿Confirmar la aprobación de este onboarding? Se notificará al cliente por WhatsApp."}
            </p>
            {motivoModal !== "APROBAR" && (
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
                placeholder="Motivo (requerido para notificación)"
                className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none resize-none"/>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setMotivoModal(null); setMotivo(""); }}
                className="py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">
                Cancelar
              </button>
              <button onClick={() => ejecutarAccion(motivoModal)} disabled={accionando}
                className={`py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
                  motivoModal === "APROBAR" ? "bg-green-600" :
                  motivoModal === "RECHAZAR" ? "bg-red-600" : "bg-yellow-600"}`}>
                {accionando ? <Loader2 size={14} className="animate-spin"/> : <MessageSquare size={14}/>}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
