"use client";

import { useEffect, useState } from "react";
import {
  collection, query, where, getDocs, doc,
  updateDoc, serverTimestamp, addDoc, getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  CheckCircle2, XCircle, AlertTriangle, Eye, FileText,
  User, Loader2, MessageSquare, ChevronDown, ChevronUp,
  Clock, BadgeCheck, Ban, RefreshCw
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type EstadoOp = "PENDIENTE_APROBACION" | "APROBADO" | "RECHAZADO" | "CORRECCIONES" | "LIQUIDADO";

interface Operacion {
  id: string;
  estadoAprobacion: EstadoOp;
  cliente: { nombre: string; dni: string; cuil?: string };
  financiero: { montoSolicitado: number; cuotas: number; valorCuota: number; tna?: number };
  bcra?: { peorSituacion: string; tieneDeudas: boolean };
  onboarding?: { completado: boolean; cbu?: string };
  documentos?: { cad_url?: string; cad_hash?: string };
  vendedorId?: string;
  entidadId: string;
  sucursalId?: string;
  aprobaciones?: { uid: string; nombre: string; rol: string; accion: string; comentario: string; fecha: any }[];
  fechaCreacion: any;
}

// ─── BADGE DE ESTADO ──────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: EstadoOp }) {
  const cfg: Record<EstadoOp, { label: string; className: string }> = {
    PENDIENTE_APROBACION: { label: "Pendiente", className: "bg-yellow-900/30 text-yellow-400 border-yellow-800/50" },
    APROBADO:            { label: "Aprobado",  className: "bg-green-900/30 text-green-400 border-green-800/50" },
    RECHAZADO:           { label: "Rechazado", className: "bg-red-900/30 text-red-400 border-red-800/50" },
    CORRECCIONES:        { label: "Correcciones", className: "bg-blue-900/30 text-blue-400 border-blue-800/50" },
    LIQUIDADO:           { label: "Liquidado", className: "bg-purple-900/30 text-purple-400 border-purple-800/50" },
  };
  const c = cfg[estado] || cfg.PENDIENTE_APROBACION;
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${c.className}`}>
      {c.label}
    </span>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function PanelAprobacion() {
  const { userData, entidadData } = useAuth();
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [filtroEstado, setFiltroEstado] = useState<EstadoOp | "TODOS">("PENDIENTE_APROBACION");
  const [onboardings, setOnboardings] = useState<Record<string, any>>({});

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  // ── Cargar operaciones ──
  const cargar = async () => {
    if (!entidadData?.id) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "operaciones"),
        where("entidadId", "==", entidadData.id)
      );
      const snap = await getDocs(q);
      const ops = snap.docs.map(d => ({ id: d.id, ...d.data() } as Operacion));
      setOperaciones(ops);

      // Cargar onboardings para ver si están completos
      const legajoIds = ops.map(o => o.id);
      if (legajoIds.length > 0) {
        const obSnap = await getDocs(
          query(collection(db, "onboarding_tokens"), where("estado", "==", "COMPLETADO"))
        );
        const obMap: Record<string, any> = {};
        obSnap.docs.forEach(d => {
          const data = d.data();
          if (data.legajoId) obMap[data.legajoId] = data;
        });
        setOnboardings(obMap);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [entidadData]);

  // ── Acción de aprobación ──
  const ejecutarAccion = async (op: Operacion, accion: "APROBADO" | "RECHAZADO" | "CORRECCIONES") => {
    const comentario = comentarios[op.id] || "";
    if (accion === "RECHAZADO" && !comentario) {
      alert("Ingresá un motivo de rechazo.");
      return;
    }
    setProcesando(op.id);
    try {
      const nuevaAprobacion = {
        uid: userData?.uid || "",
        nombre: userData?.nombre || userData?.email || "Aprobador",
        rol: userData?.rol || "",
        accion,
        comentario,
        fecha: new Date().toISOString(),
      };

      await updateDoc(doc(db, "operaciones", op.id), {
        estadoAprobacion: accion,
        [`aprobaciones`]: [...(op.aprobaciones || []), nuevaAprobacion],
        fechaUltimaAprobacion: serverTimestamp(),
      });

      // Log de auditoría
      await addDoc(collection(db, "logs_operaciones"), {
        operacionId: op.id,
        entidadId: entidadData?.id,
        usuario: userData?.email,
        accion: `APROBACION_${accion}`,
        detalles: comentario || `Acción: ${accion}`,
        fecha: serverTimestamp(),
      });

      setComentarios(prev => ({ ...prev, [op.id]: "" }));
      cargar();
    } catch (e) {
      alert("Error al procesar la acción.");
    } finally {
      setProcesando(null);
    }
  };

  // ── Filtrar ──
  const opsFiltradas = operaciones.filter(op =>
    filtroEstado === "TODOS" ? true : op.estadoAprobacion === filtroEstado
  );

  const contadores = {
    TODOS: operaciones.length,
    PENDIENTE_APROBACION: operaciones.filter(o => o.estadoAprobacion === "PENDIENTE_APROBACION").length,
    APROBADO: operaciones.filter(o => o.estadoAprobacion === "APROBADO").length,
    RECHAZADO: operaciones.filter(o => o.estadoAprobacion === "RECHAZADO").length,
    CORRECCIONES: operaciones.filter(o => o.estadoAprobacion === "CORRECCIONES").length,
  };

  // ── Semáforo BCRA ──
  const bcraColor = (sit: string) => {
    const n = parseInt(sit);
    if (n <= 1) return "text-green-400";
    if (n === 2) return "text-yellow-400";
    return "text-red-400";
  };

  // ──────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#FF5E14]" size={36} />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto text-white">

      {/* ENCABEZADO */}
      <div className="mb-8">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <BadgeCheck style={{ color: colorPrimario }} size={32} />
          Panel de Aprobación
        </h1>
        <p className="text-gray-400 mt-1">Revisá y aprobá las solicitudes de crédito de tu entidad.</p>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["PENDIENTE_APROBACION", "APROBADO", "RECHAZADO", "CORRECCIONES", "TODOS"] as const).map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filtroEstado === e
                ? "text-white"
                : "bg-gray-900 text-gray-400 hover:bg-gray-800"
            }`}
            style={filtroEstado === e ? { backgroundColor: colorPrimario } : {}}>
            {e === "PENDIENTE_APROBACION" ? "Pendientes" :
             e === "APROBADO" ? "Aprobados" :
             e === "RECHAZADO" ? "Rechazados" :
             e === "CORRECCIONES" ? "Correcciones" : "Todos"}
            <span className="bg-black/20 px-1.5 py-0.5 rounded-full">
              {contadores[e]}
            </span>
          </button>
        ))}
        <button onClick={cargar} className="ml-auto p-2 bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors">
          <RefreshCw size={16} className="text-gray-400" />
        </button>
      </div>

      {/* LISTA */}
      {opsFiltradas.length === 0 ? (
        <div className="text-center text-gray-600 py-20 bg-[#0A0A0A] border border-gray-800 rounded-2xl">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay operaciones en este estado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opsFiltradas.map(op => {
            const ob = onboardings[op.id];
            const isExpanded = expandida === op.id;
            const isProcesando = procesando === op.id;

            return (
              <div key={op.id} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">

                {/* CABECERA DE LA TARJETA */}
                <div
                  className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandida(isExpanded ? null : op.id)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-900 p-3 rounded-xl">
                        <User size={20} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{op.cliente?.nombre || "Sin nombre"}</p>
                        <p className="text-xs text-gray-500">DNI: {op.cliente?.dni} · ID: {op.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block">
                        <p className="font-bold text-white">${(op.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}</p>
                        <p className="text-xs text-gray-500">{op.financiero?.cuotas} cuotas</p>
                      </div>
                      <EstadoBadge estado={op.estadoAprobacion || "PENDIENTE_APROBACION"} />
                      {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </div>
                  </div>
                </div>

                {/* DETALLE EXPANDIDO */}
                {isExpanded && (
                  <div className="border-t border-gray-800 p-5 space-y-6">

                    {/* DATOS Y SCORING */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* Financiero */}
                      <div className="bg-gray-900/50 rounded-xl p-4 space-y-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">Crédito</p>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Monto</span><span className="font-bold">${(op.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Cuotas</span><span className="font-bold">{op.financiero?.cuotas}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Cuota</span><span className="font-bold">${(op.financiero?.valorCuota || 0).toLocaleString("es-AR")}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">TNA</span><span className="font-bold">{op.financiero?.tna || "—"}%</span></div>
                      </div>

                      {/* BCRA */}
                      <div className="bg-gray-900/50 rounded-xl p-4 space-y-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">Scoring BCRA</p>
                        {op.bcra ? (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Situación</span>
                              <span className={`font-black text-lg ${bcraColor(op.bcra.peorSituacion)}`}>
                                {op.bcra.peorSituacion}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Deudas</span>
                              <span className={op.bcra.tieneDeudas ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                                {op.bcra.tieneDeudas ? "Sí" : "No"}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-gray-600">Sin datos BCRA</p>
                        )}
                      </div>

                      {/* Onboarding */}
                      <div className="bg-gray-900/50 rounded-xl p-4 space-y-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">Onboarding</p>
                        {ob ? (
                          <>
                            <div className="flex justify-between text-sm"><span className="text-gray-400">Estado</span><span className="text-green-400 font-bold">Completo</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-400">CBU</span><span className="font-mono text-xs text-white">{ob.cbu?.slice(0, 10)}...</span></div>
                          </>
                        ) : (
                          <p className="text-xs text-yellow-500 font-bold">Pendiente de completar</p>
                        )}
                      </div>
                    </div>

                    {/* DOCUMENTOS DEL ONBOARDING */}
                    {ob && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">Documentos del Cliente</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: "DNI Frente", key: "dniFrente" },
                            { label: "DNI Dorso", key: "dniDorso" },
                            { label: "Selfie", key: "selfie" },
                            { label: "Firma", key: "firma" },
                          ].map(({ label, key }) => (
                            <div key={key} className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
                              {ob.archivos?.[key] ? (
                                <a href={ob.archivos[key]} target="_blank" rel="noopener noreferrer">
                                  <img src={ob.archivos[key]} alt={label}
                                    className="w-full h-28 object-cover hover:opacity-80 transition-opacity" />
                                  <p className="text-xs text-center text-gray-400 py-2">{label}</p>
                                </a>
                              ) : (
                                <div className="h-28 flex items-center justify-center">
                                  <p className="text-xs text-gray-600">Sin imagen</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CAD */}
                    {op.documentos?.cad_url && (
                      <div className="flex items-center gap-3 bg-gray-900/50 p-4 rounded-xl">
                        <FileText size={18} className="text-[#FF5E14]" />
                        <div className="flex-1">
                          <p className="text-sm font-bold">CAD Generado</p>
                          <p className="text-xs text-gray-500 font-mono">{op.documentos.cad_hash?.slice(0, 24)}...</p>
                        </div>
                        <a href={op.documentos.cad_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[#FF5E14] hover:underline">
                          <Eye size={14} /> Ver PDF
                        </a>
                      </div>
                    )}

                    {/* HISTORIAL DE APROBACIONES */}
                    {op.aprobaciones && op.aprobaciones.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">Historial</p>
                        <div className="space-y-2">
                          {op.aprobaciones.map((a, i) => (
                            <div key={i} className="flex items-start gap-3 bg-gray-900/30 p-3 rounded-xl text-sm">
                              <span className={`font-black text-xs mt-0.5 ${
                                a.accion === "APROBADO" ? "text-green-400" :
                                a.accion === "RECHAZADO" ? "text-red-400" : "text-blue-400"
                              }`}>{a.accion}</span>
                              <div className="flex-1">
                                <p className="text-gray-300 font-bold">{a.nombre} <span className="text-gray-600 font-normal text-xs">({a.rol})</span></p>
                                {a.comentario && <p className="text-gray-500 text-xs mt-0.5">{a.comentario}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ACCIONES — Solo si puede aprobar */}
                    {(op.estadoAprobacion === "PENDIENTE_APROBACION" || op.estadoAprobacion === "CORRECCIONES") && (
                      <div className="border-t border-gray-800 pt-5 space-y-4">
                        <div>
                          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                            <MessageSquare size={12} className="inline mr-1" />
                            Comentario (requerido para rechazar)
                          </label>
                          <textarea
                            value={comentarios[op.id] || ""}
                            onChange={e => setComentarios(prev => ({ ...prev, [op.id]: e.target.value }))}
                            placeholder="Motivo de rechazo o instrucciones de corrección..."
                            rows={2}
                            className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gray-500 resize-none"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => ejecutarAccion(op, "APROBADO")}
                            disabled={!!isProcesando}
                            className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                            {isProcesando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Aprobar
                          </button>
                          <button
                            onClick={() => ejecutarAccion(op, "CORRECCIONES")}
                            disabled={!!isProcesando}
                            className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                            <AlertTriangle size={16} />
                            Pedir Correcciones
                          </button>
                          <button
                            onClick={() => ejecutarAccion(op, "RECHAZADO")}
                            disabled={!!isProcesando}
                            className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                            <Ban size={16} />
                            Rechazar
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
