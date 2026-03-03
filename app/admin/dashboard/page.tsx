"use client";
// app/admin/dashboard/page.tsx
import { useState, useEffect, useMemo } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import * as XLSX from "xlsx";
import {
  Building2, TrendingUp, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, Download, ChevronRight, ChevronDown,
  MessageSquare, Globe, Eye, Fingerprint, CreditCard,
  DollarSign, Users, Activity, Percent, Settings,
  Save, X, Hash
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt    = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const fmtM   = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : fmt(n);
const alerta = { MORA_ALTA: { color: "text-red-400", bg: "bg-red-900/20", border: "border-red-900/40" },
                 SIN_ACTIVIDAD: { color: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-900/40" },
                 SIN_WHATSAPP:  { color: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-900/40" } };

const TIPOS_COMISION = [
  { value: "PORCENTUAL",       label: "Porcentual sobre monto originado",     sufijo: "%"  },
  { value: "FIJA_POR_CLIENTE", label: "Fija por cliente/operación",           sufijo: "$"  },
  { value: "FIJA_MENSUAL",     label: "Cuota fija mensual",                   sufijo: "$/mes"},
];

// ── Componente ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data,        setData]        = useState<any>(null);
  const [cargando,    setCargando]    = useState(true);
  const [filtro,      setFiltro]      = useState("");
  const [ordenPor,    setOrdenPor]    = useState<"monto"|"mora"|"nombre">("monto");
  const [drilldown,   setDrilldown]   = useState<string | null>(null);
  const [modalComis,  setModalComis]  = useState<any | null>(null); // entidad para editar comisión
  const [comisEdit,   setComisEdit]   = useState({ tipo: "PORCENTUAL", valor: 0, notas: "" });
  const [guardando,   setGuardando]   = useState(false);

  useEffect(() => {
    if (!authLoading && userData?.rol !== "MASTER_PAYSUR") router.push("/login");
  }, [userData, authLoading]);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/metricas");
      const json = await res.json();
      if (json.success) setData(json);
    } finally { setCargando(false); }
  };
  useEffect(() => { cargar(); }, []);

  // Entidades filtradas y ordenadas
  const entidadesFiltradas = useMemo(() => {
    if (!data) return [];
    let lista = [...(data.metricasPorEntidad || [])];
    if (filtro) lista = lista.filter(e => e.nombre.toLowerCase().includes(filtro.toLowerCase()) || e.provincia?.toLowerCase().includes(filtro.toLowerCase()));
    lista.sort((a, b) =>
      ordenPor === "monto" ? b.montoCartera - a.montoCartera :
      ordenPor === "mora"  ? b.porcMora    - a.porcMora      :
      a.nombre.localeCompare(b.nombre));
    return lista;
  }, [data, filtro, ordenPor]);

  // Exportar Excel
  const exportarExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Hoja 1: KPIs
    const kpis = data.kpis;
    const ws1 = XLSX.utils.aoa_to_sheet([
      ["Indicador", "Valor"],
      ["Total entidades", kpis.totalEntidades],
      ["Total operaciones", kpis.totalOps],
      ["Cartera activa", kpis.cartaTotal],
      ["En mora", kpis.enMora],
      ["% mora global", kpis.porcMora + "%"],
      ["Total originado", kpis.totalOriginado],
      ["Comisión estimada del mes", kpis.comisionTotalMes],
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "KPIs Globales");

    // Hoja 2: Entidades
    const ws2 = XLSX.utils.aoa_to_sheet([
      ["Entidad","Provincia","Ops totales","Cartera","En mora","% mora","Comisión tipo","Comisión valor","Comisión est. mes"],
      ...data.metricasPorEntidad.map((e: any) => [
        e.nombre, e.provincia, e.totalOps,
        e.montoCartera, e.enMora, e.porcMora + "%",
        e.comision?.tipo, e.comision?.valor, e.comisionMes,
      ])
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, "Por Entidad");

    // Hoja 3: Tendencia
    const ws3 = XLSX.utils.aoa_to_sheet([
      ["Mes","Operaciones","Monto","En mora"],
      ...data.tendencia.map((t: any) => [t.mes, t.originadas, t.monto, t.mora])
    ]);
    XLSX.utils.book_append_sheet(wb, ws3, "Tendencia");

    XLSX.writeFile(wb, `paysur-ejecutivo-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Guardar comisión
  const guardarComision = async () => {
    if (!modalComis) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", modalComis.id), {
        comision: { tipo: comisEdit.tipo, valor: Number(comisEdit.valor), notas: comisEdit.notas },
      });
      setModalComis(null);
      cargar();
    } finally { setGuardando(false); }
  };

  const abrirComision = (ent: any) => {
    setComisEdit({
      tipo:  ent.comision?.tipo  || "PORCENTUAL",
      valor: ent.comision?.valor || 0,
      notas: ent.comision?.notas || "",
    });
    setModalComis(ent);
  };

  if (cargando || authLoading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-600" size={32}/>
    </div>
  );

  const k = data?.kpis || {};

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 lg:p-10 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Dashboard Ejecutivo</h1>
          <p className="text-gray-500 text-sm mt-1">Paysur Finanzas — visión global de todas las entidades</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={cargar} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white transition-all text-sm font-bold">
            <RefreshCw size={14}/> Actualizar
          </button>
          <button onClick={exportarExcel} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5E14] text-white font-bold text-sm">
            <Download size={14}/> Exportar Excel
          </button>
        </div>
      </div>

      {/* ── KPIs globales ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Entidades",         valor: k.totalEntidades,      icon: <Building2 size={18}/>,  color: "text-blue-400",   fmt: (v: number) => v },
          { label: "Cartera activa",    valor: k.cartaTotal,          icon: <DollarSign size={18}/>, color: "text-green-400",  fmt: fmtM },
          { label: "En mora",           valor: `${k.porcMora}%`,      icon: <AlertTriangle size={18}/>, color: k.porcMora > 10 ? "text-red-400" : "text-yellow-400", fmt: (v: any) => v },
          { label: "Comisión del mes",  valor: k.comisionTotalMes,    icon: <TrendingUp size={18}/>, color: "text-purple-400", fmt: fmtM },
        ].map((kpi, i) => (
          <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <div className={`${kpi.color} mb-2`}>{kpi.icon}</div>
            <p className={`text-2xl font-black ${kpi.color}`}>{typeof kpi.valor === "number" ? kpi.fmt(kpi.valor) : kpi.valor}</p>
            <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── Alertas ── */}
      {data?.alertas?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Alertas activas ({data.alertas.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.alertas.map((a: any, i: number) => {
              const s = alerta[a.tipo as keyof typeof alerta] || alerta.SIN_ACTIVIDAD;
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${s.bg} ${s.border}`}>
                  <AlertTriangle size={13} className={s.color}/>
                  <div>
                    <p className={`text-xs font-bold ${s.color}`}>{a.nombre}</p>
                    <p className={`text-[10px] ${s.color} opacity-70`}>{a.mensaje}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Tendencia originación */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Originación mensual (últimos 6 meses)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data?.tendencia} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#111"/>
              <XAxis dataKey="mes" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false}/>
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 12 }} labelStyle={{ color: "#fff" }}/>
              <Bar dataKey="originadas" fill="#FF5E14" radius={[4,4,0,0]} name="Ops"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tendencia monto */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Monto originado mensual</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data?.tendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111"/>
              <XAxis dataKey="mes" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false}/>
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000000).toFixed(1)}M`}/>
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 12 }} formatter={(v: any) => fmtM(v)}/>
              <Line dataKey="monto" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} name="Monto"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tabla entidades ── */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
        {/* Controles tabla */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 flex-wrap">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mr-auto">
            Entidades ({entidadesFiltradas.length})
          </p>
          <input value={filtro} onChange={e => setFiltro(e.target.value)}
            placeholder="Buscar entidad..." className="bg-[#111] border border-gray-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none w-44"/>
          <select value={ordenPor} onChange={e => setOrdenPor(e.target.value as any)}
            className="bg-[#111] border border-gray-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none">
            <option value="monto">Por cartera</option>
            <option value="mora">Por mora</option>
            <option value="nombre">Por nombre</option>
          </select>
        </div>

        {/* Cabecera */}
        <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] text-gray-600 uppercase font-bold tracking-widest border-b border-gray-900">
          <div className="col-span-3">Entidad</div>
          <div className="col-span-2 text-right">Cartera</div>
          <div className="col-span-1 text-right">Ops</div>
          <div className="col-span-1 text-right">Mora</div>
          <div className="col-span-2">Integraciones</div>
          <div className="col-span-2">Comisión</div>
          <div className="col-span-1"/>
        </div>

        {/* Filas */}
        <div className="divide-y divide-gray-900 max-h-[480px] overflow-y-auto">
          {entidadesFiltradas.map(ent => (
            <div key={ent.id}>
              <div
                onClick={() => setDrilldown(drilldown === ent.id ? null : ent.id)}
                className="grid grid-cols-12 gap-2 px-5 py-3 hover:bg-white/5 cursor-pointer transition-all items-center group">

                {/* Nombre */}
                <div className="col-span-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: ent.activa ? ent.colorPrimario : "#374151" }}/>
                  <div>
                    <p className="text-sm font-bold text-white truncate">{ent.nombre}</p>
                    <p className="text-[10px] text-gray-600">{ent.provincia}</p>
                  </div>
                </div>

                {/* Cartera */}
                <div className="col-span-2 text-right">
                  <p className="text-sm font-black text-white">{fmtM(ent.montoCartera)}</p>
                </div>

                {/* Ops */}
                <div className="col-span-1 text-right">
                  <p className="text-sm text-gray-300">{ent.totalOps}</p>
                </div>

                {/* Mora */}
                <div className="col-span-1 text-right">
                  <p className={`text-sm font-bold ${ent.porcMora > 15 ? "text-red-400" : ent.porcMora > 5 ? "text-yellow-400" : "text-green-400"}`}>
                    {ent.porcMora}%
                  </p>
                </div>

                {/* Integraciones */}
                <div className="col-span-2 flex gap-1.5">
                  {[
                    { k: "whatsapp", icon: <MessageSquare size={10}/>, label: "WA"  },
                    { k: "pagos360", icon: <CreditCard    size={10}/>, label: "P360"},
                    { k: "portal",   icon: <Globe         size={10}/>, label: "Web" },
                    { k: "vision",   icon: <Eye           size={10}/>, label: "AI"  },
                    { k: "cuad",     icon: <Fingerprint   size={10}/>, label: "CUAD"},
                  ].map(itg => (
                    <span key={itg.k}
                      title={itg.label}
                      className={`w-5 h-5 rounded-md flex items-center justify-center ${ent.integraciones[itg.k] ? "bg-green-900/40 text-green-400" : "bg-gray-900 text-gray-700"}`}>
                      {itg.icon}
                    </span>
                  ))}
                </div>

                {/* Comisión */}
                <div className="col-span-2 flex items-center gap-2">
                  <div>
                    <p className="text-xs text-gray-300 font-bold">
                      {ent.comision?.tipo === "PORCENTUAL"       ? `${ent.comision.valor}%`              :
                       ent.comision?.tipo === "FIJA_POR_CLIENTE" ? `${fmt(ent.comision.valor)}/op`       :
                       ent.comision?.tipo === "FIJA_MENSUAL"     ? `${fmt(ent.comision.valor)}/mes`      :
                       "Sin config"}
                    </p>
                    <p className="text-[10px] text-gray-600">{fmtM(ent.comisionMes)}/mes</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); abrirComision(ent); }}
                    className="ml-1 text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                    <Settings size={13}/>
                  </button>
                </div>

                {/* Chevron */}
                <div className="col-span-1 flex justify-end text-gray-600">
                  {drilldown === ent.id ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                </div>
              </div>

              {/* Drilldown */}
              {drilldown === ent.id && (
                <div className="px-5 pb-4 pt-2 bg-[#060606] border-t border-gray-900 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Liquidadas",    valor: ent.liquidadas,                     color: "text-green-400"  },
                      { label: "En mora",       valor: `${ent.enMora} ops`,                color: ent.enMora > 0 ? "text-red-400" : "text-gray-400" },
                      { label: "Monto en mora", valor: fmtM(ent.montoMora),               color: "text-red-400"    },
                      { label: "Última op",     valor: ent.ultimaActividad ? new Date(ent.ultimaActividad).toLocaleDateString("es-AR") : "—", color: "text-gray-400" },
                    ].map((d, i) => (
                      <div key={i} className="bg-[#0A0A0A] rounded-xl p-3">
                        <p className="text-[10px] text-gray-600 uppercase font-bold">{d.label}</p>
                        <p className={`text-sm font-black mt-0.5 ${d.color}`}>{d.valor}</p>
                      </div>
                    ))}
                  </div>
                  {ent.diasSinActividad > 7 && (
                    <p className="text-xs text-yellow-400 mt-3 flex items-center gap-1.5">
                      <AlertTriangle size={11}/> {ent.diasSinActividad} días sin nuevas operaciones
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal comisión ── */}
      {modalComis && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-gray-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-black text-white text-lg">Comisión — {modalComis.nombre}</p>
              <button onClick={() => setModalComis(null)} className="text-gray-600 hover:text-white">
                <X size={18}/>
              </button>
            </div>

            <div className="space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Tipo de comisión</label>
                <div className="space-y-2">
                  {TIPOS_COMISION.map(t => (
                    <label key={t.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${comisEdit.tipo === t.value ? "border-[#FF5E14] bg-[#FF5E14]/10" : "border-gray-700 hover:border-gray-600"}`}>
                      <input type="radio" className="hidden" value={t.value} checked={comisEdit.tipo === t.value}
                        onChange={() => setComisEdit(p => ({ ...p, tipo: t.value }))}/>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${comisEdit.tipo === t.value ? "border-[#FF5E14]" : "border-gray-600"}`}>
                        {comisEdit.tipo === t.value && <div className="w-2 h-2 rounded-full bg-[#FF5E14]"/>}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{t.label}</p>
                        <p className="text-[10px] text-gray-500">Valor en {t.sufijo}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-2">
                  Valor ({TIPOS_COMISION.find(t => t.value === comisEdit.tipo)?.sufijo})
                </label>
                <input type="number" min={0} step={comisEdit.tipo === "PORCENTUAL" ? 0.1 : 100}
                  value={comisEdit.valor}
                  onChange={e => setComisEdit(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"/>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Notas internas</label>
                <input type="text" value={comisEdit.notas}
                  onChange={e => setComisEdit(p => ({ ...p, notas: e.target.value }))}
                  placeholder="Ej: Acuerdo firmado 01/2025, revisión en julio"
                  className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"/>
              </div>

              {/* Preview */}
              <div className="bg-[#0A0A0A] rounded-xl p-3 text-xs text-gray-400">
                <p className="font-bold text-white mb-1">Estimación mensual</p>
                {comisEdit.tipo === "FIJA_MENSUAL" && <p>{fmt(comisEdit.valor)} fijos por mes</p>}
                {comisEdit.tipo === "FIJA_POR_CLIENTE" && <p>{fmt(comisEdit.valor)} × ops del mes = variable</p>}
                {comisEdit.tipo === "PORCENTUAL" && <p>{comisEdit.valor}% sobre monto originado del mes = variable</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setModalComis(null)}
                className="py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">
                Cancelar
              </button>
              <button onClick={guardarComision} disabled={guardando}
                className="py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 bg-[#FF5E14] disabled:opacity-50">
                {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
