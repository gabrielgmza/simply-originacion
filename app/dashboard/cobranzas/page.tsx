"use client";
import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs, addDoc,
  serverTimestamp, doc, updateDoc, orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { registrarEvento } from "@/lib/auditoria/logger";
import {
  PhoneCall, MessageSquare, User, Calendar,
  AlertTriangle, CheckCircle2, XCircle, Loader2,
  Clock, DollarSign, Ban, Plus, ChevronRight, X
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type TipoGestion = "LLAMADA" | "WHATSAPP" | "VISITA" | "EMAIL" | "OTRO";
type EstadoGestion = "CONTACTADO" | "SIN_RESPUESTA" | "PROMESA" | "NIEGA_DEUDA" | "IRRECUPERABLE";

interface Caso {
  id: string;
  estado: string;
  cliente?: { nombre?: string; dni?: string; telefono?: string };
  financiero?: { montoSolicitado?: number; valorCuota?: number; cuotas?: number };
  fechaLiquidacion?: any;
  cobranzas?: {
    diasMora?: number;
    ultimaPromesa?: string;
    estadoGestion?: string;
    punitorio?: number;
    irrecuperable?: boolean;
  };
}

interface Gestion {
  id: string;
  tipo: TipoGestion;
  resultado: EstadoGestion;
  detalle: string;
  fechaPromesa?: string;
  fecha?: any;
  agente?: string;
}

const TIPO_ICONS: Record<TipoGestion, React.ReactNode> = {
  LLAMADA:   <PhoneCall size={14} />,
  WHATSAPP:  <MessageSquare size={14} />,
  VISITA:    <User size={14} />,
  EMAIL:     <MessageSquare size={14} />,
  OTRO:      <Clock size={14} />,
};

const RESULTADO_COLORS: Record<EstadoGestion, string> = {
  CONTACTADO:    "text-blue-400",
  SIN_RESPUESTA: "text-gray-400",
  PROMESA:       "text-yellow-400",
  NIEGA_DEUDA:   "text-orange-400",
  IRRECUPERABLE: "text-red-500",
};

const PUNITORIO_DIARIO = 0.0012; // 0.12% diario

function calcularPunitorio(monto: number, dias: number): number {
  return Math.round(monto * PUNITORIO_DIARIO * dias);
}

function calcularDiasMora(fechaLiquidacion: any): number {
  if (!fechaLiquidacion) return 0;
  const fecha = fechaLiquidacion?.toDate?.() || new Date(fechaLiquidacion);
  const hoy = new Date();
  const diff = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function CobranzasPage() {
  const { entidadData, userData } = useAuth();
  const [casos, setCasos] = useState<Caso[]>([]);
  const [seleccionado, setSeleccionado] = useState<Caso | null>(null);
  const [gestiones, setGestiones] = useState<Gestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Form nueva gestión
  const [tipo, setTipo] = useState<TipoGestion>("LLAMADA");
  const [resultado, setResultado] = useState<EstadoGestion>("CONTACTADO");
  const [detalle, setDetalle] = useState("");
  const [fechaPromesa, setFechaPromesa] = useState("");

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  // ── Cargar casos en mora ──
  const cargar = async () => {
    if (!entidadData?.id) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "operaciones"),
          where("entidadId", "==", entidadData.id),
          where("estado", "==", "EN_MORA"))
      );
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Caso));
      // Calcular días mora en tiempo real
      const conDias = data.map(c => ({
        ...c,
        cobranzas: {
          ...c.cobranzas,
          diasMora: c.cobranzas?.diasMora || calcularDiasMora(c.fechaLiquidacion),
          punitorio: calcularPunitorio(
            c.financiero?.montoSolicitado || 0,
            c.cobranzas?.diasMora || calcularDiasMora(c.fechaLiquidacion)
          ),
        }
      }));
      // Ordenar por días mora descendente
      conDias.sort((a, b) => (b.cobranzas?.diasMora || 0) - (a.cobranzas?.diasMora || 0));
      setCasos(conDias);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [entidadData]);

  // ── Cargar gestiones del caso seleccionado ──
  const cargarGestiones = async (casoId: string) => {
    try {
      const snap = await getDocs(
        query(collection(db, "logs_cobranzas"),
          where("operacionId", "==", casoId),
          orderBy("fechaGestion", "desc"))
      );
      setGestiones(snap.docs.map(d => ({ id: d.id, ...d.data() } as Gestion)));
    } catch (e) { console.error(e); }
  };

  const seleccionar = (caso: Caso) => {
    setSeleccionado(caso);
    cargarGestiones(caso.id);
    setDetalle(""); setFechaPromesa(""); setTipo("LLAMADA"); setResultado("CONTACTADO");
  };

  // ── Registrar gestión ──
  const registrarGestion = async () => {
    if (!seleccionado || !detalle.trim()) { alert("Escribí un detalle de la gestión."); return; }
    setGuardando(true);
    try {
      await addDoc(collection(db, "logs_cobranzas"), {
        operacionId: seleccionado.id,
        entidadId: entidadData?.id,
        tipo,
        resultado,
        detalle,
        fechaPromesa: resultado === "PROMESA" ? fechaPromesa : null,
        fechaGestion: serverTimestamp(),
        agente: userData?.nombre || userData?.email || "Sistema",
      });

      const updates: any = {
        "cobranzas.estadoGestion": resultado,
        "cobranzas.ultimaGestion": serverTimestamp(),
      };
      if (resultado === "PROMESA" && fechaPromesa) {
        updates["cobranzas.ultimaPromesa"] = fechaPromesa;
      }
      await updateDoc(doc(db, "operaciones", seleccionado.id), updates);

      await registrarEvento({
        operacionId: seleccionado.id,
        entidadId: entidadData?.id || "",
        usuarioEmail: userData?.email || "",
        usuarioNombre: userData?.nombre,
        accion: "ESTADO_EN_MORA",
        detalles: `Gestión ${tipo}: ${resultado} — ${detalle.slice(0, 60)}`,
      });

      setDetalle(""); setFechaPromesa("");
      cargarGestiones(seleccionado.id);
      cargar();
    } catch (e) { alert("Error al registrar la gestión."); }
    finally { setGuardando(false); }
  };

  // ── Marcar irrecuperable ──
  const marcarIrrecuperable = async () => {
    if (!seleccionado) return;
    if (!confirm(`¿Marcar la operación de ${seleccionado.cliente?.nombre} como IRRECUPERABLE?\nEsta acción queda registrada en la auditoría.`)) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "operaciones", seleccionado.id), {
        "cobranzas.irrecuperable": true,
        "cobranzas.estadoGestion": "IRRECUPERABLE",
        "cobranzas.fechaIrrecuperable": serverTimestamp(),
      });
      await registrarEvento({
        operacionId: seleccionado.id,
        entidadId: entidadData?.id || "",
        usuarioEmail: userData?.email || "",
        usuarioNombre: userData?.nombre,
        accion: "ESTADO_EN_MORA",
        detalles: "Marcada como IRRECUPERABLE por el gestor.",
      });
      setSeleccionado(null);
      cargar();
    } catch (e) { alert("Error."); }
    finally { setGuardando(false); }
  };

  // ── KPIs ──
  const moraTemprana = casos.filter(c => (c.cobranzas?.diasMora || 0) <= 30).length;
  const moraTardia   = casos.filter(c => (c.cobranzas?.diasMora || 0) > 90).length;
  const totalPunitorio = casos.reduce((a, c) => a + (c.cobranzas?.punitorio || 0), 0);
  const conPromesa   = casos.filter(c => c.cobranzas?.ultimaPromesa).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ENCABEZADO */}
      <div>
        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Cobranzas</h1>
        <p className="text-gray-500 text-sm mt-1">{casos.length} operaciones en mora</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Mora temprana (≤30d)", valor: moraTemprana, icono: <Clock size={18}/>, color: "#f59e0b" },
          { label: "Mora tardía (+90d)",   valor: moraTardia,   icono: <AlertTriangle size={18}/>, color: "#ef4444" },
          { label: "Con promesa",           valor: conPromesa,   icono: <Calendar size={18}/>, color: "#22c55e" },
          { label: "Punitorios totales",    valor: `$${(totalPunitorio/1000).toFixed(0)}K`, icono: <DollarSign size={18}/>, color: colorPrimario },
        ].map((k, i) => (
          <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4">
            <div className="mb-2" style={{ color: k.color }}>{k.icono}</div>
            <p className="text-xl font-black text-white">{k.valor}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* LAYOUT DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LISTA DE CASOS ── */}
        <div className="lg:col-span-2 space-y-2 max-h-[65vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-600" size={28}/></div>
          ) : casos.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <CheckCircle2 size={36} className="mx-auto mb-2 opacity-20"/>
              <p className="text-sm">Sin operaciones en mora.</p>
            </div>
          ) : casos.map(c => {
            const dias = c.cobranzas?.diasMora || 0;
            const colorDias = dias > 90 ? "#ef4444" : dias > 30 ? "#f59e0b" : "#f97316";
            const activo = seleccionado?.id === c.id;
            return (
              <div key={c.id} onClick={() => seleccionar(c)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${activo ? "border-opacity-60" : "border-gray-800 hover:bg-white/[0.02]"}`}
                style={activo ? { borderColor: colorPrimario, backgroundColor: `${colorPrimario}11` } : {}}>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-bold text-white text-sm">{c.cliente?.nombre || "—"}</p>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${colorDias}22`, color: colorDias }}>
                    {dias}d mora
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono mb-2">DNI {c.cliente?.dni}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Capital</span>
                  <span className="font-bold text-white">${(c.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}</span>
                </div>
                <div className="flex justify-between text-xs mt-0.5">
                  <span className="text-gray-500">Punitorio</span>
                  <span className="font-bold" style={{ color: colorPrimario }}>+${(c.cobranzas?.punitorio || 0).toLocaleString("es-AR")}</span>
                </div>
                {c.cobranzas?.ultimaPromesa && (
                  <p className="text-[10px] text-yellow-400 mt-1.5 flex items-center gap-1">
                    <Calendar size={10}/> Promesa: {c.cobranzas.ultimaPromesa}
                  </p>
                )}
                {c.cobranzas?.irrecuperable && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><Ban size={10}/> Irrecuperable</p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── PANEL DE GESTIÓN ── */}
        <div className="lg:col-span-3">
          {!seleccionado ? (
            <div className="h-full border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-600 py-20">
              <PhoneCall size={36} className="mb-3 opacity-20"/>
              <p className="text-sm">Seleccioná un caso para gestionar</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Resumen del caso */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-black text-white">{seleccionado.cliente?.nombre}</h2>
                    <p className="text-xs text-gray-500">DNI {seleccionado.cliente?.dni}</p>
                    {seleccionado.cliente?.telefono && (
                      <p className="text-xs mt-1" style={{ color: colorPrimario }}>📱 {seleccionado.cliente.telefono}</p>
                    )}
                  </div>
                  <button onClick={marcarIrrecuperable} disabled={guardando || seleccionado.cobranzas?.irrecuperable}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-white hover:bg-red-900/40 px-3 py-2 rounded-xl transition-colors border border-red-900/50 disabled:opacity-30">
                    <Ban size={13}/> Irrecuperable
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-900/50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Capital</p>
                    <p className="font-black text-white">${(seleccionado.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}</p>
                  </div>
                  <div className="bg-red-900/20 border border-red-900/30 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Punitorios</p>
                    <p className="font-black text-red-400">+${(seleccionado.cobranzas?.punitorio || 0).toLocaleString("es-AR")}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Total</p>
                    <p className="font-black text-white">
                      ${((seleccionado.financiero?.montoSolicitado || 0) + (seleccionado.cobranzas?.punitorio || 0)).toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-gray-600 mt-2 text-center">
                  Punitorio: 0.12% diario sobre capital · {seleccionado.cobranzas?.diasMora || 0} días de mora
                </p>
              </div>

              {/* Form nueva gestión */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Nueva gestión</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">Canal</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value as TipoGestion)}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                      <option value="LLAMADA">📞 Llamada</option>
                      <option value="WHATSAPP">💬 WhatsApp</option>
                      <option value="VISITA">🚗 Visita</option>
                      <option value="EMAIL">📧 Email</option>
                      <option value="OTRO">📋 Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">Resultado</label>
                    <select value={resultado} onChange={e => setResultado(e.target.value as EstadoGestion)}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                      <option value="CONTACTADO">Contactado</option>
                      <option value="SIN_RESPUESTA">Sin respuesta</option>
                      <option value="PROMESA">Promesa de pago</option>
                      <option value="NIEGA_DEUDA">Niega la deuda</option>
                      <option value="IRRECUPERABLE">Irrecuperable</option>
                    </select>
                  </div>
                </div>

                {resultado === "PROMESA" && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">Fecha de la promesa</label>
                    <input type="date" value={fechaPromesa} onChange={e => setFechaPromesa(e.target.value)}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">Detalle de la gestión</label>
                  <textarea value={detalle} onChange={e => setDetalle(e.target.value)} rows={3}
                    placeholder="Ej: Cliente indicó que cobra el viernes y realizará el pago..."
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none resize-none" />
                </div>

                <button onClick={registrarGestion} disabled={guardando || !detalle.trim()}
                  className="w-full py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                  style={{ backgroundColor: colorPrimario }}>
                  {guardando ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
                  Registrar gestión
                </button>
              </div>

              {/* Historial de gestiones */}
              {gestiones.length > 0 && (
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Historial</p>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {gestiones.map(g => (
                      <div key={g.id} className="flex gap-3">
                        <div className={`mt-0.5 shrink-0 ${RESULTADO_COLORS[g.resultado] || "text-gray-500"}`}>
                          {TIPO_ICONS[g.tipo] || <Clock size={14}/>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${RESULTADO_COLORS[g.resultado]}`}>{g.resultado?.replace(/_/g," ")}</span>
                            <span className="text-[10px] text-gray-600">
                              {g.fecha?.toDate?.()?.toLocaleDateString("es-AR") || "—"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{g.detalle}</p>
                          {g.fechaPromesa && (
                            <p className="text-[10px] text-yellow-400 mt-0.5 flex items-center gap-1"><Calendar size={9}/> {g.fechaPromesa}</p>
                          )}
                          <p className="text-[10px] text-gray-600 mt-0.5">por {g.agente}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
