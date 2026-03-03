"use client";
// app/dashboard/liquidacion/masiva/page.tsx
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import * as XLSX from "xlsx";
import {
  Loader2, CheckCircle2, XCircle, AlertTriangle,
  Download, Play, ChevronRight, Eye, EyeOff,
  ShieldCheck, History, Filter, DollarSign,
  FileText, RotateCcw, Lock
} from "lucide-react";

const fmt  = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const fmtM = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : `$${(n/1000).toFixed(0)}K`;

type Paso = "seleccion" | "validacion" | "preview" | "pin" | "resultado" | "historial";

export default function LiquidacionMasivaPage() {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  // Config
  const [cfg, setCfg] = useState<any>({});

  // Paso actual
  const [paso, setPaso]           = useState<Paso>("seleccion");

  // Operaciones disponibles
  const [ops,        setOps]        = useState<any[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [seleccion,  setSeleccion]  = useState<Set<string>>(new Set());

  // Filtros
  const [filtroTipo,      setFiltroTipo]      = useState("TODOS");
  const [filtroSucursal,  setFiltroSucursal]  = useState("TODOS");
  const [filtroVendedor,  setFiltroVendedor]  = useState("TODOS");

  // Validación
  const [validaciones, setValidaciones]   = useState<any[]>([]);
  const [validando,    setValidando]      = useState(false);

  // Nros de transferencia por op
  const [numerosTransf, setNumerosTransf] = useState<Record<string, string>>({});

  // PIN
  const [pin,           setPin]           = useState("");
  const [pinError,      setPinError]      = useState("");

  // Resultado
  const [resultado,     setResultado]     = useState<any>(null);
  const [ejecutando,    setEjecutando]    = useState(false);

  // Historial
  const [lotes,         setLotes]         = useState<any[]>([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);

  const puedeEjecutar = ["GERENTE_GENERAL","LIQUIDADOR","MASTER_PAYSUR"].includes(userData?.rol || "");

  // Cargar config y ops aprobadas
  useEffect(() => {
    if (!entidadData?.id) return;
    const cargar = async () => {
      setCargando(true);

      // Config liquidación masiva
      const entSnap = await getDoc(doc(db, "entidades", entidadData.id));
      setCfg(entSnap.data()?.configuracion?.liquidacionMasiva || {});

      // Operaciones en estado APROBADO
      const snap = await getDocs(
        query(collection(db, "operaciones"),
          where("entidadId", "==", entidadData.id),
          where("estado",    "==", "APROBADO"))
      );
      setOps(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
      setCargando(false);
    };
    cargar();
  }, [entidadData]);

  // Ops filtradas
  const opsFiltradas = useMemo(() => ops.filter(op => {
    if (filtroTipo     !== "TODOS" && op.tipo      !== filtroTipo)     return false;
    if (filtroSucursal !== "TODOS" && op.sucursalId!== filtroSucursal) return false;
    if (filtroVendedor !== "TODOS" && op.vendedorId !== filtroVendedor) return false;
    return true;
  }), [ops, filtroTipo, filtroSucursal, filtroVendedor]);

  const sucursales = [...new Set(ops.map(o => o.sucursalId).filter(Boolean))];
  const vendedores = [...new Set(ops.map(o => o.vendedorId).filter(Boolean))];

  const opsSel = ops.filter(o => seleccion.has(o.id));
  const montoTotal = opsSel.reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);

  // Toggle selección
  const toggleOp    = (id: string) => setSeleccion(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleTodas = () => setSeleccion(prev => prev.size === opsFiltradas.length ? new Set() : new Set(opsFiltradas.map(o => o.id)));

  // Validar
  const validar = async () => {
    if (!seleccion.size) return;
    setValidando(true);
    try {
      const res  = await fetch("/api/liquidacion/masiva", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidadId: entidadData?.id, operacionIds: [...seleccion], accion: "VALIDAR", usuarioEmail: userData?.email }),
      });
      const data = await res.json();
      if (data.success) { setValidaciones(data.validaciones); setPaso("validacion"); }
    } finally { setValidando(false); }
  };

  const irAPreview = () => {
    // Init nros transf vacíos
    const init: Record<string, string> = {};
    validaciones.filter(v => v.valida).forEach(v => { init[v.id] = ""; });
    setNumerosTransf(init);
    setPaso("preview");
  };

  // Exportar Excel del lote
  const exportarExcel = () => {
    const validas = validaciones.filter(v => v.valida);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nombre","DNI","CBU","Monto","Cuotas","Nro Transferencia"],
      ...validas.map(v => [v.nombre, v.dni, v.cbu, v.monto, v.cuotas, numerosTransf[v.id] || ""])
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Lote Liquidación");
    XLSX.writeFile(wb, `lote-liquidacion-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Ejecutar
  const ejecutar = async () => {
    setPinError("");
    setEjecutando(true);
    try {
      const res  = await fetch("/api/liquidacion/masiva", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entidadId:       entidadData?.id,
          operacionIds:    validaciones.filter(v => v.valida).map(v => v.id),
          accion:          "EJECUTAR",
          usuarioEmail:    userData?.email,
          numerosTransf,
          pinConfirmacion: pin,
        }),
      });
      const data = await res.json();
      if (!data.success) { setPinError(data.error || "Error al ejecutar"); return; }
      setResultado(data);
      setPaso("resultado");
    } finally { setEjecutando(false); }
  };

  // Cargar historial
  const cargarHistorial = async () => {
    if (!entidadData?.id) return;
    setCargandoLotes(true);
    try {
      const res  = await fetch(`/api/liquidacion/masiva?entidadId=${entidadData.id}`);
      const data = await res.json();
      if (data.success) setLotes(data.lotes);
    } finally { setCargandoLotes(false); }
  };

  const reiniciar = () => {
    setSeleccion(new Set()); setValidaciones([]); setResultado(null); setPin(""); setPinError("");
    setPaso("seleccion");
    // Recargar ops
    if (entidadData?.id) {
      getDocs(query(collection(db, "operaciones"), where("entidadId","==",entidadData.id), where("estado","==","APROBADO")))
        .then(snap => setOps(snap.docs.map(d => ({ id: d.id, ...d.data() as any }))));
    }
  };

  const validasCount   = validaciones.filter(v => v.valida).length;
  const invalidasCount = validaciones.filter(v => !v.valida).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Liquidación Masiva</h1>
          <p className="text-gray-500 text-sm mt-0.5">{ops.length} operaciones aprobadas disponibles</p>
        </div>
        <button onClick={() => { setPaso("historial"); cargarHistorial(); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white transition-all text-sm font-bold">
          <History size={14}/> Historial de lotes
        </button>
      </div>

      {/* Stepper */}
      {paso !== "historial" && (
        <div className="flex items-center gap-1 text-xs">
          {[
            { key: "seleccion",  label: "Selección"  },
            { key: "validacion", label: "Validación" },
            { key: "preview",    label: "Preview"    },
            { key: "pin",        label: "Confirmar"  },
            { key: "resultado",  label: "Resultado"  },
          ].map((s, i, arr) => (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`px-3 py-1 rounded-lg font-bold transition-all ${paso === s.key ? "text-white" : "text-gray-600"}`}
                style={paso === s.key ? { backgroundColor: colorPrimario } : {}}>
                {s.label}
              </div>
              {i < arr.length - 1 && <ChevronRight size={12} className="text-gray-700"/>}
            </div>
          ))}
        </div>
      )}

      {/* ── PASO 1: Selección ── */}
      {paso === "seleccion" && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Tipo", value: filtroTipo, set: setFiltroTipo, opts: ["TODOS","ADELANTO","CUAD","PRIVADO"] },
              { label: "Sucursal", value: filtroSucursal, set: setFiltroSucursal, opts: ["TODOS", ...sucursales] },
            ].map((f, i) => (
              <select key={i} value={f.value} onChange={e => f.set(e.target.value)}
                className="bg-[#0A0A0A] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                {f.opts.map(o => <option key={o} value={o}>{o === "TODOS" ? `Todos (${f.label})` : o}</option>)}
              </select>
            ))}
          </div>

          {/* Tabla selección */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800">
              <input type="checkbox" checked={seleccion.size === opsFiltradas.length && opsFiltradas.length > 0}
                onChange={toggleTodas} className="w-4 h-4 rounded accent-orange-500"/>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest flex-1">
                {seleccion.size} seleccionadas · {fmtM(montoTotal)}
              </p>
            </div>

            {cargando ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-600" size={22}/></div>
            ) : opsFiltradas.length === 0 ? (
              <div className="text-center py-12 text-gray-600 text-sm">No hay operaciones aprobadas.</div>
            ) : (
              <div className="divide-y divide-gray-900 max-h-96 overflow-y-auto">
                {opsFiltradas.map(op => (
                  <div key={op.id} onClick={() => toggleOp(op.id)}
                    className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition-all hover:bg-white/5 ${seleccion.has(op.id) ? "bg-white/5" : ""}`}>
                    <input type="checkbox" checked={seleccion.has(op.id)} onChange={() => {}} className="w-4 h-4 rounded accent-orange-500 pointer-events-none"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{op.cliente?.nombre}</p>
                      <p className="text-xs text-gray-500">DNI {op.cliente?.dni} · {op.tipo}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-white">{fmt(op.financiero?.montoSolicitado || 0)}</p>
                      <p className="text-[10px] text-gray-600">CBU: {op.cliente?.cbu ? "✓" : "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen + acción */}
          {seleccion.size > 0 && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white">{seleccion.size} operaciones · {fmt(montoTotal)}</p>
                <p className="text-xs text-gray-500">Se validarán antes de ejecutar</p>
              </div>
              <button onClick={validar} disabled={validando || !puedeEjecutar}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: colorPrimario }}>
                {validando ? <Loader2 size={14} className="animate-spin"/> : <ShieldCheck size={14}/>}
                Validar lote
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PASO 2: Validación ── */}
      {paso === "validacion" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Válidas",   valor: validasCount,   color: "text-green-400", bg: "bg-green-900/20" },
              { label: "Con error", valor: invalidasCount, color: "text-red-400",   bg: "bg-red-900/20"   },
              { label: "Total",     valor: validaciones.length, color: "text-white", bg: "bg-[#0A0A0A]"    },
            ].map((k, i) => (
              <div key={i} className={`${k.bg} border border-gray-800 rounded-2xl p-4 text-center`}>
                <p className={`text-2xl font-black ${k.color}`}>{k.valor}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-900 max-h-80 overflow-y-auto">
            {validaciones.map(v => (
              <div key={v.id} className={`flex items-start gap-3 px-5 py-3 ${v.valida ? "" : "bg-red-900/5"}`}>
                {v.valida
                  ? <CheckCircle2 size={15} className="text-green-400 shrink-0 mt-0.5"/>
                  : <XCircle     size={15} className="text-red-400 shrink-0 mt-0.5"/>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{v.nombre}</p>
                  {!v.valida && <p className="text-xs text-red-400 mt-0.5">{v.errores.join(" · ")}</p>}
                </div>
                <p className="text-sm font-black text-white shrink-0">{fmt(v.monto)}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPaso("seleccion")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">
              <RotateCcw size={14}/> Volver
            </button>
            {validasCount > 0 && (
              <button onClick={irAPreview}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm"
                style={{ backgroundColor: colorPrimario }}>
                Continuar con {validasCount} válidas <ChevronRight size={14}/>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PASO 3: Preview ── */}
      {paso === "preview" && (
        <div className="space-y-4">
          {/* Resumen del lote */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">Resumen del lote</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Operaciones", valor: validasCount                                  },
                { label: "Monto total", valor: fmt(validaciones.filter(v=>v.valida).reduce((a,v)=>a+v.monto,0)) },
                { label: "CBUs listos", valor: `${validaciones.filter(v=>v.valida && v.cbu).length}/${validasCount}` },
              ].map((k, i) => (
                <div key={i} className="bg-gray-900/40 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-white">{k.valor}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla con nros de transferencia */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Operaciones a liquidar</p>
              {cfg.exportarExcel !== false && (
                <button onClick={exportarExcel}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors font-bold">
                  <Download size={12}/> Exportar Excel
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-900 max-h-72 overflow-y-auto">
              {validaciones.filter(v => v.valida).map(v => (
                <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{v.nombre}</p>
                    <p className="text-xs text-gray-500">CBU: {v.cbu || "—"}</p>
                  </div>
                  <p className="text-sm font-black text-white shrink-0">{fmt(v.monto)}</p>
                  {cfg.registrarTransferencia !== false && (
                    <input
                      type="text"
                      value={numerosTransf[v.id] || ""}
                      onChange={e => setNumerosTransf(prev => ({ ...prev, [v.id]: e.target.value }))}
                      placeholder="Nro transf."
                      className="w-28 bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none shrink-0"/>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPaso("validacion")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">
              <RotateCcw size={14}/> Volver
            </button>
            <button onClick={() => setPaso(cfg.requierePin ? "pin" : "resultado") || (cfg.requierePin ? null : ejecutar())}
              disabled={ejecutando}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: colorPrimario }}>
              {cfg.requierePin ? <><Lock size={14}/> Ingresar PIN</> : <><Play size={14}/> Liquidar {validasCount} ops</>}
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 4: PIN ── */}
      {paso === "pin" && (
        <div className="max-w-sm mx-auto space-y-5">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-900/30 flex items-center justify-center mx-auto mb-3">
                <Lock size={20} className="text-orange-400"/>
              </div>
              <p className="font-black text-white">Confirmar con PIN</p>
              <p className="text-xs text-gray-500 mt-1">Ingresá el PIN de aprobación para ejecutar el lote</p>
            </div>

            <input type="password" maxLength={8} value={pin} onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === "Enter" && ejecutar()}
              placeholder="••••••••"
              className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-xl tracking-[0.5em] font-black focus:outline-none"/>

            {pinError && (
              <p className="text-xs text-red-400 flex items-center justify-center gap-1.5">
                <AlertTriangle size={12}/> {pinError}
              </p>
            )}

            <button onClick={ejecutar} disabled={ejecutando || !pin}
              className="w-full py-3.5 rounded-xl text-white font-black flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: colorPrimario }}>
              {ejecutando ? <Loader2 size={16} className="animate-spin"/> : <Play size={16}/>}
              {ejecutando ? "Ejecutando..." : `Liquidar ${validasCount} operaciones`}
            </button>

            <button onClick={() => setPaso("preview")} className="w-full py-2 text-xs text-gray-600 hover:text-gray-400">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 5: Resultado ── */}
      {paso === "resultado" && resultado && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-5 border ${resultado.fallidas === 0 ? "bg-green-900/10 border-green-900/40" : "bg-yellow-900/10 border-yellow-900/40"}`}>
            <div className="flex items-center gap-3 mb-3">
              {resultado.fallidas === 0
                ? <CheckCircle2 size={20} className="text-green-400"/>
                : <AlertTriangle size={20} className="text-yellow-400"/>}
              <div>
                <p className="font-black text-white">
                  {resultado.fallidas === 0 ? "Lote ejecutado correctamente" : "Lote ejecutado con errores"}
                </p>
                <p className="text-xs text-gray-500">Lote ID: {resultado.loteId}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Exitosas", valor: resultado.exitosas, color: "text-green-400" },
                { label: "Fallidas", valor: resultado.fallidas, color: resultado.fallidas > 0 ? "text-red-400" : "text-gray-500" },
                { label: "Total",    valor: resultado.total,    color: "text-white" },
              ].map((k, i) => (
                <div key={i} className="bg-black/20 rounded-xl p-3 text-center">
                  <p className={`text-xl font-black ${k.color}`}>{k.valor}</p>
                  <p className="text-[10px] text-gray-500">{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          {resultado.fallidas > 0 && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Operaciones con error</p>
              {resultado.resultados.filter((r: any) => !r.ok).map((r: any) => (
                <p key={r.id} className="text-xs text-red-400 flex items-center gap-1.5">
                  <XCircle size={11}/> {r.id} — {r.error}
                </p>
              ))}
            </div>
          )}

          <button onClick={reiniciar}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm"
            style={{ backgroundColor: colorPrimario }}>
            <RotateCcw size={14}/> Nuevo lote
          </button>
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {paso === "historial" && (
        <div className="space-y-4">
          <button onClick={() => setPaso("seleccion")}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors font-bold">
            <RotateCcw size={13}/> Volver al módulo
          </button>

          {cargandoLotes ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-600" size={22}/></div>
          ) : lotes.length === 0 ? (
            <div className="bg-[#0A0A0A] border border-dashed border-gray-800 rounded-2xl p-12 text-center text-gray-600">
              No hay lotes registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {lotes.map(l => (
                <div key={l.id} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">Lote {l.id.slice(0,8).toUpperCase()}</p>
                    <p className="text-xs text-gray-500">
                      {l.fechaCreacion ? new Date(l.fechaCreacion).toLocaleString("es-AR") : "—"} · {l.usuarioEmail}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-white">{fmt(l.montoTotal)}</p>
                    <p className="text-xs text-gray-500">{l.cantidadOps} ops</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                    l.estado === "COMPLETADO"   ? "text-green-400 bg-green-900/20" :
                    l.estado === "CON_ERRORES"  ? "text-yellow-400 bg-yellow-900/20" :
                    "text-gray-400 bg-gray-900/20"}`}>
                    {l.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
