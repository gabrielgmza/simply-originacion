"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer
} from "recharts";
import {
  Download, Loader2, Filter, TrendingUp,
  DollarSign, AlertTriangle, Building2
} from "lucide-react";

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n}`;

const ESTADOS = ["todos","LIQUIDADO","EN_MORA","FINALIZADO","APROBADO","RECHAZADO","EN_REVISION"];
const PIE_COLORS = ["#FF5E14","#3b82f6","#22c55e","#ef4444","#a855f7","#f59e0b","#6b7280"];

export default function ReportesPage() {
  const { entidadData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [ops,        setOps]        = useState<any[]>([]);
  const [sucursales, setSucursales]  = useState<any[]>([]);
  const [usuarios,   setUsuarios]   = useState<any[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [exportando, setExportando] = useState(false);

  const [desde,       setDesde]       = useState("");
  const [hasta,       setHasta]       = useState("");
  const [sucFiltro,   setSucFiltro]   = useState("todas");
  const [estadoFiltro,setEstadoFiltro]= useState("todos");

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      setCargando(true);
      try {
        const [opsSnap, sucSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, "operaciones"), where("entidadId", "==", entidadData.id))),
          getDocs(query(collection(db, "sucursales"),  where("entidadId", "==", entidadData.id))),
          getDocs(query(collection(db, "usuarios"),    where("entidadId", "==", entidadData.id))),
        ]);
        setOps(opsSnap.docs.map(d => ({
          id: d.id, ...d.data(),
          _fecha: d.data().fechaCreacion?.toDate?.() || null,
        })));
        setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setUsuarios(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally { setCargando(false); }
    };
    cargar();
  }, [entidadData]);

  const sucMap  = useMemo(() => Object.fromEntries(sucursales.map(s => [s.id, s.nombre])), [sucursales]);
  const userMap = useMemo(() => Object.fromEntries(usuarios.map(u => [u.id, u.nombre || u.email])), [usuarios]);

  const opsFiltradas = useMemo(() => {
    const desdeD = desde ? new Date(desde)               : null;
    const hastaD = hasta ? new Date(hasta + "T23:59:59")  : null;
    return ops.filter(o => {
      if (desdeD && o._fecha && o._fecha < desdeD) return false;
      if (hastaD && o._fecha && o._fecha > hastaD) return false;
      if (sucFiltro    !== "todas" && o.sucursalId !== sucFiltro)    return false;
      if (estadoFiltro !== "todos" && o.estado     !== estadoFiltro) return false;
      return true;
    });
  }, [ops, desde, hasta, sucFiltro, estadoFiltro]);

  const kpis = useMemo(() => {
    const liquidadas = opsFiltradas.filter(o => ["LIQUIDADO","FINALIZADO"].includes(o.estado));
    const mora       = opsFiltradas.filter(o => o.estado === "EN_MORA");
    return {
      totalOps:   opsFiltradas.length,
      montoTotal: liquidadas.reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0),
      enMora:     mora.length,
      porcMora:   opsFiltradas.length > 0 ? ((mora.length / opsFiltradas.length) * 100).toFixed(1) : "0",
    };
  }, [opsFiltradas]);

  const dataSucursales = useMemo(() => {
    const lista = [...sucursales, { id: "sin_sucursal", nombre: "Sin asignar" }];
    return lista.map(s => {
      const opsSuc = opsFiltradas.filter(o =>
        s.id === "sin_sucursal" ? !o.sucursalId : o.sucursalId === s.id);
      const monto  = opsSuc.filter(o => ["LIQUIDADO","FINALIZADO"].includes(o.estado))
                           .reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
      return {
        nombre: s.nombre,
        ops:    opsSuc.length,
        monto:  Math.round(monto / 1000),
        mora:   opsSuc.filter(o => o.estado === "EN_MORA").length,
      };
    }).filter(s => s.ops > 0);
  }, [opsFiltradas, sucursales]);

  const dataEstados = useMemo(() => {
    const counts: Record<string, number> = {};
    opsFiltradas.forEach(o => { counts[o.estado] = (counts[o.estado] || 0) + 1; });
    return Object.entries(counts).map(([estado, valor]) => ({ estado, valor }));
  }, [opsFiltradas]);

  const rankingVendedores = useMemo(() => {
    const map: Record<string, { nombre: string; sucursal: string; ops: number; monto: number; mora: number }> = {};
    opsFiltradas.forEach(o => {
      const vid = o.vendedorId || "—";
      if (!map[vid]) map[vid] = {
        nombre:   userMap[vid] || vid.slice(0, 8),
        sucursal: sucMap[o.sucursalId] || "Sin asignar",
        ops: 0, monto: 0, mora: 0,
      };
      map[vid].ops++;
      if (["LIQUIDADO","FINALIZADO"].includes(o.estado))
        map[vid].monto += (o.financiero?.montoSolicitado || 0);
      if (o.estado === "EN_MORA") map[vid].mora++;
    });
    return Object.values(map).sort((a, b) => b.monto - a.monto).slice(0, 15);
  }, [opsFiltradas, userMap, sucMap]);

  const exportarExcel = async () => {
    if (!entidadData?.id) return;
    setExportando(true);
    try {
      const res = await fetch("/api/reportes/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidadId: entidadData.id, desde, hasta, sucursalId: sucFiltro, estado: estadoFiltro }),
      });
      if (!res.ok) { alert("Error al generar el Excel."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `reporte-${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally { setExportando(false); }
  };

  if (cargando) return (
    <div className="flex justify-center py-32"><Loader2 className="animate-spin text-gray-600" size={28}/></div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Reportes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{opsFiltradas.length} operaciones en el período</p>
        </div>
        <button onClick={exportarExcel} disabled={exportando || opsFiltradas.length === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: colorPrimario }}>
          {exportando ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>}
          Exportar Excel
        </button>
      </div>

      {/* FILTROS */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 flex flex-wrap gap-4 items-end">
        <Filter size={14} className="text-gray-500 shrink-0 mb-1"/>
        {[
          { label: "Desde", value: desde, set: setDesde, type: "date" },
          { label: "Hasta", value: hasta, set: setHasta, type: "date" },
        ].map(f => (
          <div key={f.label}>
            <label className="block text-[10px] text-gray-600 uppercase font-bold mb-1">{f.label}</label>
            <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
              className="bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"/>
          </div>
        ))}
        <div>
          <label className="block text-[10px] text-gray-600 uppercase font-bold mb-1">Sucursal</label>
          <select value={sucFiltro} onChange={e => setSucFiltro(e.target.value)}
            className="bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
            <option value="todas">Todas</option>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-600 uppercase font-bold mb-1">Estado</label>
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}
            className="bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
            {ESTADOS.map(e => <option key={e} value={e}>{e === "todos" ? "Todos" : e.replace(/_/g," ")}</option>)}
          </select>
        </div>
        {(desde || hasta || sucFiltro !== "todas" || estadoFiltro !== "todos") && (
          <button onClick={() => { setDesde(""); setHasta(""); setSucFiltro("todas"); setEstadoFiltro("todos"); }}
            className="text-xs text-gray-500 hover:text-white underline mb-1">
            Limpiar
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Operaciones",    valor: kpis.totalOps,        color: "text-white",    icon: <TrendingUp size={16}/> },
          { label: "Monto liquidado",valor: fmt(kpis.montoTotal), color: "text-green-400", icon: <DollarSign size={16}/> },
          { label: "En mora",        valor: kpis.enMora,          color: kpis.enMora > 0 ? "text-red-400" : "text-gray-600", icon: <AlertTriangle size={16}/> },
          { label: "% Mora",         valor: `${kpis.porcMora}%`,  color: parseFloat(kpis.porcMora) > 5 ? "text-orange-400" : "text-gray-400", icon: <Building2 size={16}/> },
        ].map((k, i) => (
          <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4">
            <div className={`mb-2 ${k.color}`}>{k.icon}</div>
            <p className={`text-2xl font-black ${k.color}`}>{k.valor}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Operaciones por sucursal</p>
          {dataSucursales.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataSucursales} margin={{ left: -10 }}>
                <XAxis dataKey="nombre" tick={{ fill: "#6b7280", fontSize: 10 }}/>
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }}/>
                <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#fff" }} itemStyle={{ color: "#9ca3af" }}/>
                <Bar dataKey="ops"  name="Ops"  fill={colorPrimario} radius={[4,4,0,0]}/>
                <Bar dataKey="mora" name="Mora" fill="#ef4444"       radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-600 text-sm text-center py-16">Sin datos</p>}
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Distribución por estado</p>
          {dataEstados.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataEstados} dataKey="valor" nameKey="estado"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  label={({ estado, percent }) => `${(percent*100).toFixed(0)}%`}
                  labelLine={false}>
                  {dataEstados.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [v, name?.replace(/_/g," ")]}
                  contentStyle={{ backgroundColor: "#111", border: "1px solid #374151", borderRadius: 8 }}
                  itemStyle={{ color: "#9ca3af" }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-600 text-sm text-center py-16">Sin datos</p>}
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Monto liquidado por sucursal ($K)</p>
          {dataSucursales.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataSucursales} margin={{ left: -10 }}>
                <XAxis dataKey="nombre" tick={{ fill: "#6b7280", fontSize: 10 }}/>
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }}/>
                <Tooltip formatter={(v: any) => [`$${v}K`, "Monto"]}
                  contentStyle={{ backgroundColor: "#111", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#fff" }} itemStyle={{ color: "#9ca3af" }}/>
                <Bar dataKey="monto" name="Monto ($K)" fill="#22c55e" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-600 text-sm text-center py-16">Sin datos</p>}
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Top 5 vendedores</p>
          {rankingVendedores.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rankingVendedores.slice(0,5)} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }}/>
                <YAxis type="category" dataKey="nombre" width={90} tick={{ fill: "#9ca3af", fontSize: 10 }}/>
                <Tooltip formatter={(v: any) => [fmt(v), "Monto"]}
                  contentStyle={{ backgroundColor: "#111", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#fff" }} itemStyle={{ color: "#9ca3af" }}/>
                <Bar dataKey="monto" fill="#a855f7" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-600 text-sm text-center py-16">Sin datos</p>}
        </div>
      </div>

      {/* TABLA RANKING */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Ranking de vendedores</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr>
                {["#","Vendedor","Sucursal","Ops","Monto liquidado","En mora"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {rankingVendedores.map((v, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-black text-gray-600">#{i+1}</td>
                  <td className="px-5 py-3 font-bold text-white">{v.nombre}</td>
                  <td className="px-5 py-3 text-gray-400">{v.sucursal}</td>
                  <td className="px-5 py-3 font-bold text-white">{v.ops}</td>
                  <td className="px-5 py-3 font-bold text-green-400">{fmt(v.monto)}</td>
                  <td className="px-5 py-3">
                    {v.mora > 0
                      ? <span className="text-red-400 font-bold">{v.mora}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                </tr>
              ))}
              {rankingVendedores.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-600">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
