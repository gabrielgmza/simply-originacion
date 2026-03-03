"use client";
// app/fondeador/page.tsx
// Acceso por email/password — ruta pública, no usa useAuth de entidad
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signOut as fbSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import * as XLSX from "xlsx";
import {
  Loader2, LogOut, DollarSign, TrendingUp, AlertTriangle,
  CheckCircle2, Eye, FileText, Download, ChevronDown,
  ChevronUp, CreditCard, BarChart2, History, Calculator, X
} from "lucide-react";

const fmt  = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const fmtM = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : fmt(n);

const ESTADO_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  LIQUIDADO:    { label: "Activo",     color: "text-green-400",  bg: "bg-green-900/20"  },
  EN_MORA:      { label: "En mora",    color: "text-red-400",    bg: "bg-red-900/20"    },
  FINALIZADO:   { label: "Cancelado",  color: "text-gray-400",   bg: "bg-gray-900/20"   },
  APROBADO:     { label: "Aprobado",   color: "text-blue-400",   bg: "bg-blue-900/20"   },
  RECHAZADO:    { label: "Rechazado",  color: "text-red-400",    bg: "bg-red-900/20"    },
};

export default function PortalFondeadorPage() {
  // ── Estado auth ─────────────────────────────────────────────────────────────
  const [autenticado, setAutenticado] = useState(false);
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [errAuth,     setErrAuth]     = useState("");
  const [logueando,   setLogueando]   = useState(false);

  // ── Estado datos ─────────────────────────────────────────────────────────────
  const [datos,       setDatos]       = useState<any>(null);
  const [cargando,    setCargando]    = useState(false);
  const [seccion,     setSeccion]     = useState<"cartera"|"estadisticas"|"contabilidad">("cartera");
  const [opSelec,     setOpSelec]     = useState<any>(null);  // legajo modal
  const [filtroEstado,setFiltroEstado]= useState("TODOS");

  const login = async () => {
    setLogueando(true); setErrAuth("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Buscar fondeadorId del usuario
      const uSnap = await getDocs(query(collection(db, "usuarios"), where("uid", "==", cred.user.uid)));
      if (uSnap.empty || uSnap.docs[0].data().rol !== "FONDEADOR") {
        await fbSignOut(auth);
        setErrAuth("No tenés acceso a este portal."); return;
      }
      const fondeadorId = uSnap.docs[0].data().fondeadorId;
      await cargarDatos(fondeadorId);
      setAutenticado(true);
    } catch { setErrAuth("Email o contraseña incorrectos."); }
    finally  { setLogueando(false); }
  };

  const cargarDatos = async (fondeadorId: string) => {
    setCargando(true);
    try {
      const res  = await fetch("/api/fondeo/portal", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fondeadorId }),
      });
      const data = await res.json();
      if (data.success) setDatos(data);
    } finally { setCargando(false); }
  };

  const logout = async () => { await fbSignOut(auth); setAutenticado(false); setDatos(null); };

  const exportarExcel = () => {
    if (!datos?.operaciones) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Cliente","DNI","Estado","Monto","Cuota","TNA","Asignado","Total Pagado"],
      ...datos.operaciones.map((o: any) => [
        o.cliente?.nombre, o.cliente?.dni, o.estado,
        o.financiero?.montoSolicitado, o.financiero?.valorCuota,
        o.fondeo?.tna, o.fechaCreacion ? new Date(o.fechaCreacion).toLocaleDateString("es-AR") : "—",
        o.totalPagado,
      ])
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Mi Cartera");
    XLSX.writeFile(wb, `cartera-${datos.fondeador?.nombre}-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const permisos = datos?.permisos || {};
  const ops: any[] = datos?.operaciones || [];
  const opsFiltradas = filtroEstado === "TODOS" ? ops : ops.filter(o => o.estado === filtroEstado);

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  if (!autenticado) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FF5E14] mx-auto mb-3 flex items-center justify-center text-white font-black text-xl">F</div>
          <h1 className="text-xl font-black text-gray-800">Portal Fondeadores</h1>
          <p className="text-sm text-gray-500 mt-1">Paysur Finanzas</p>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-gray-400"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-gray-400"/>
          </div>
          {errAuth && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertTriangle size={12}/>{errAuth}</p>}
          <button onClick={login} disabled={logueando}
            className="w-full py-3.5 rounded-2xl bg-[#FF5E14] text-white font-black flex items-center justify-center gap-2 disabled:opacity-60">
            {logueando ? <Loader2 size={16} className="animate-spin"/> : "Ingresar"}
          </button>
        </div>
      </div>
    </div>
  );

  if (cargando || !datos) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-600" size={28}/>
    </div>
  );

  const r = datos.resumen || {};
  const c = datos.contabilidad || {};

  // ── DASHBOARD ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">

      {/* Header */}
      <div className="bg-[#0A0A0A] border-b border-gray-900 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FF5E14] flex items-center justify-center text-white font-black text-sm">F</div>
            <div>
              <p className="font-black text-white text-sm">{datos.fondeador?.nombre}</p>
              <p className="text-[10px] text-gray-500">TNA {datos.fondeador?.tna}%</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
            <LogOut size={13}/> Salir
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-6">

        {/* Tabs de sección */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "cartera",       label: "Cartera",       icon: <BarChart2 size={12}/>,    show: permisos.verCartera !== false || permisos.verHistorial !== false },
            { key: "estadisticas",  label: "Estadísticas",  icon: <TrendingUp size={12}/>,   show: permisos.verEstadisticas !== false },
            { key: "contabilidad",  label: "Contabilidad",  icon: <Calculator size={12}/>,   show: permisos.verContabilidad },
          ].filter(s => s.show).map(s => (
            <button key={s.key} onClick={() => setSeccion(s.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${seccion === s.key ? "text-white border-transparent bg-[#FF5E14]" : "text-gray-500 border-gray-800 hover:text-white"}`}>
              {s.icon}{s.label}
            </button>
          ))}
        </div>

        {/* ── CARTERA ── */}
        {seccion === "cartera" && (
          <div className="space-y-5">

            {/* KPIs */}
            {permisos.verCartera !== false && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Capital asignado",  valor: fmtM(r.capitalAsignado || 0), color: "text-blue-400"   },
                  { label: "Total cobrado",      valor: fmtM(r.totalCobrado    || 0), color: "text-green-400"  },
                  { label: "Capital pendiente",  valor: fmtM(r.capitalPendiente|| 0), color: "text-orange-400" },
                  { label: "% mora",             valor: `${r.porcMora || 0}%`,        color: r.porcMora > 10 ? "text-red-400" : "text-yellow-400" },
                ].map((k, i) => (
                  <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4">
                    <p className={`text-xl font-black ${k.color}`}>{k.valor}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{k.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filtro + Exportar */}
            {permisos.verHistorial !== false && (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex gap-2">
                    {["TODOS","LIQUIDADO","EN_MORA","FINALIZADO"].map(f => (
                      <button key={f} onClick={() => setFiltroEstado(f)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${filtroEstado === f ? "bg-[#FF5E14] text-white border-transparent" : "text-gray-500 border-gray-800"}`}>
                        {f === "TODOS" ? "Todos" : ESTADO_BADGE[f]?.label || f}
                      </button>
                    ))}
                  </div>
                  {permisos.exportarExcel && (
                    <button onClick={exportarExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A0A0A] border border-gray-800 text-gray-400 hover:text-white text-xs font-bold transition-all">
                      <Download size={12}/> Exportar Excel
                    </button>
                  )}
                </div>

                {/* Lista operaciones */}
                <div className="space-y-2">
                  {opsFiltradas.length === 0 && (
                    <div className="bg-[#0A0A0A] border border-dashed border-gray-800 rounded-2xl p-10 text-center text-gray-600 text-sm">
                      No hay operaciones en este estado.
                    </div>
                  )}
                  {opsFiltradas.map((op: any) => {
                    const badge = ESTADO_BADGE[op.estado] || { label: op.estado, color: "text-gray-400", bg: "bg-gray-900/20" };
                    return (
                      <div key={op.id} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
                        {permisos.verLegajos && op.legajo?.selfieUrl && (
                          <img src={op.legajo.selfieUrl} className="w-10 h-10 rounded-xl object-cover border border-gray-700 shrink-0"/>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{op.cliente?.nombre}</p>
                          <p className="text-xs text-gray-500">DNI {op.cliente?.dni} · {op.fondeo?.tna}% TNA</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-white">{fmtM(op.financiero?.montoSolicitado || 0)}</p>
                          <p className="text-[10px] text-gray-500">{fmt(op.financiero?.valorCuota || 0)}/cuota</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${badge.color} ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {(permisos.verLegajos || permisos.verPlanCuotas) && (
                          <button onClick={() => setOpSelec(op)} className="text-gray-600 hover:text-white transition-colors shrink-0">
                            <Eye size={15}/>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ESTADÍSTICAS ── */}
        {seccion === "estadisticas" && permisos.verEstadisticas !== false && datos.tendencia && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Operaciones asignadas / mes</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={datos.tendencia} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#111"/>
                    <XAxis dataKey="mes" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false}/>
                    <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 12 }}/>
                    <Bar dataKey="asignadas" fill="#FF5E14" radius={[4,4,0,0]} name="Ops"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Monto asignado vs cobrado / mes</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={datos.tendencia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111"/>
                    <XAxis dataKey="mes" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false}/>
                    <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtM(v)}/>
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 12 }} formatter={(v: any) => fmtM(v)}/>
                    <Line dataKey="monto"   stroke="#3b82f6" strokeWidth={2} dot={false} name="Asignado"/>
                    <Line dataKey="cobrado" stroke="#22c55e" strokeWidth={2} dot={false} name="Cobrado"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── CONTABILIDAD ── */}
        {seccion === "contabilidad" && permisos.verContabilidad && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Capital asignado",    valor: fmt(c.capitalAsignado  || 0), color: "text-blue-400"   },
              { label: "Capital cobrado",     valor: fmt(c.totalCobrado     || 0), color: "text-green-400"  },
              { label: "Capital pendiente",   valor: fmt(c.capitalPendiente || 0), color: "text-orange-400" },
              { label: "Interés devengado",   valor: fmt(c.interesDevengado || 0), color: "text-purple-400" },
              { label: "Capital en mora",     valor: fmt(c.capitalEnMora    || 0), color: "text-red-400"    },
              { label: "% mora",              valor: `${c.porcMora || 0}%`,        color: c.porcMora > 10 ? "text-red-400" : "text-yellow-400" },
            ].map((k, i) => (
              <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{k.label}</p>
                <p className={`text-xl font-black ${k.color}`}>{k.valor}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal legajo / detalle operación ── */}
      {opSelec && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-[#111]">
              <p className="font-black text-white">{opSelec.cliente?.nombre}</p>
              <button onClick={() => setOpSelec(null)} className="text-gray-600 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">

              {/* Datos del crédito */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Monto",    valor: fmt(opSelec.financiero?.montoSolicitado || 0) },
                  { label: "Cuota",    valor: fmt(opSelec.financiero?.valorCuota || 0) },
                  { label: "TNA",      valor: `${opSelec.fondeo?.tna || 0}%` },
                  { label: "Pagado",   valor: fmt(opSelec.totalPagado || 0) },
                ].map((d, i) => (
                  <div key={i} className="bg-[#0A0A0A] rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">{d.label}</p>
                    <p className="text-sm font-black text-white">{d.valor}</p>
                  </div>
                ))}
              </div>

              {/* Legajo */}
              {permisos.verLegajos && opSelec.legajo && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Legajo</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "DNI Frente", url: opSelec.legajo.dniFrenteUrl },
                      { label: "DNI Dorso",  url: opSelec.legajo.dniDorsoUrl  },
                      { label: "Selfie",     url: opSelec.legajo.selfieUrl     },
                      { label: "Firma",      url: opSelec.legajo.firmaUrl      },
                    ].map((img, i) => img.url ? (
                      <div key={i}>
                        <img src={img.url} className="w-full h-24 object-cover rounded-xl border border-gray-800"/>
                        <p className="text-[10px] text-gray-600 mt-1 text-center">{img.label}</p>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Plan cuotas */}
              {permisos.verPlanCuotas && opSelec.pagos?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Pagos recibidos</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {opSelec.pagos.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-[#0A0A0A] rounded-xl px-3 py-2">
                        <p className="text-xs text-gray-400">{p.fecha ? new Date(p.fecha).toLocaleDateString("es-AR") : "—"}</p>
                        <p className="text-xs font-black text-green-400">{fmt(p.monto)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
