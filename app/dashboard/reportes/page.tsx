"use client";
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Download, TrendingUp, Users, AlertTriangle,
  CheckCircle2, XCircle, Loader2, Calendar, FileText
} from "lucide-react";
import * as XLSX from "xlsx";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Operacion {
  id: string;
  estado: string;
  estadoAprobacion?: string;
  vendedorId?: string;
  sucursalId?: string;
  financiero?: { montoSolicitado?: number; cuotas?: number; valorCuota?: number };
  cliente?: { nombre?: string; dni?: string };
  fechaCreacion?: any;
  cobranzas?: { diasMora?: number };
}

interface Usuario {
  id: string;
  nombre?: string;
  email?: string;
  rol?: string;
  sucursalId?: string;
  comisionPorcentaje?: number;
}

type Periodo = "7d" | "30d" | "90d" | "todo";

const COLORES_GRAFICOS = ["#FF5E14", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function metricCard(label: string, valor: string | number, icono: React.ReactNode, color: string) {
  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
      <div className="mb-2" style={{ color }}>{icono}</div>
      <p className="text-2xl font-black text-white">{valor}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function ReportesPage() {
  const { entidadData } = useAuth();
  const [ops, setOps] = useState<Operacion[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [sucursalFiltro, setSucursalFiltro] = useState("TODAS");

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  // ── Cargar datos ──
  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      setLoading(true);
      try {
        const [opsSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, "operaciones"), where("entidadId", "==", entidadData.id))),
          getDocs(query(collection(db, "usuarios"), where("entidadId", "==", entidadData.id))),
        ]);
        setOps(opsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Operacion)));
        setUsuarios(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Usuario)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    cargar();
  }, [entidadData]);

  // ── Filtrar por período ──
  const opsFiltradas = useMemo(() => {
    const ahora = new Date();
    const diasMap: Record<Periodo, number> = { "7d": 7, "30d": 30, "90d": 90, "todo": 99999 };
    const diasAtras = diasMap[periodo];
    const desde = new Date(ahora.getTime() - diasAtras * 24 * 60 * 60 * 1000);

    return ops.filter(op => {
      const fecha = op.fechaCreacion?.toDate?.() || new Date(op.fechaCreacion || 0);
      const matchPeriodo = fecha >= desde;
      const matchSucursal = sucursalFiltro === "TODAS" || op.sucursalId === sucursalFiltro;
      return matchPeriodo && matchSucursal;
    });
  }, [ops, periodo, sucursalFiltro]);

  // ── Métricas globales ──
  const totalMonto = opsFiltradas.reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
  const totalOps = opsFiltradas.length;
  const aprobadas = opsFiltradas.filter(o => ["APROBADO", "LIQUIDADO", "FINALIZADO"].includes(o.estado)).length;
  const rechazadas = opsFiltradas.filter(o => o.estado === "RECHAZADO").length;
  const enMora = opsFiltradas.filter(o => o.estado === "EN_MORA").length;
  const tasaAprobacion = totalOps > 0 ? Math.round((aprobadas / totalOps) * 100) : 0;

  // ── Operaciones por vendedor ──
  const porVendedor = useMemo(() => {
    const mapa: Record<string, { nombre: string; ops: number; monto: number; comision: number }> = {};
    opsFiltradas.forEach(op => {
      if (!op.vendedorId) return;
      const user = usuarios.find(u => u.id === op.vendedorId);
      const nombre = user?.nombre || user?.email?.split("@")[0] || op.vendedorId.slice(0, 8);
      const monto = op.financiero?.montoSolicitado || 0;
      const comisionPorc = user?.comisionPorcentaje || 1;
      if (!mapa[op.vendedorId]) mapa[op.vendedorId] = { nombre, ops: 0, monto: 0, comision: 0 };
      mapa[op.vendedorId].ops += 1;
      mapa[op.vendedorId].monto += monto;
      mapa[op.vendedorId].comision += monto * (comisionPorc / 100);
    });
    return Object.values(mapa).sort((a, b) => b.monto - a.monto);
  }, [opsFiltradas, usuarios]);

  // ── Monto por mes ──
  const porMes = useMemo(() => {
    const mapa: Record<string, number> = {};
    opsFiltradas.forEach(op => {
      const fecha = op.fechaCreacion?.toDate?.() || new Date(op.fechaCreacion || 0);
      const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      mapa[clave] = (mapa[clave] || 0) + (op.financiero?.montoSolicitado || 0);
    });
    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, monto]) => ({ mes: mes.slice(5) + "/" + mes.slice(2, 4), monto }));
  }, [opsFiltradas]);

  // ── Tasa aprobación/rechazo (pie) ──
  const pieData = [
    { name: "Aprobadas", value: aprobadas },
    { name: "Rechazadas", value: rechazadas },
    { name: "Pendientes", value: totalOps - aprobadas - rechazadas },
  ].filter(d => d.value > 0);

  // ── Mora por sucursal ──
  const moraPorSucursal = useMemo(() => {
    const mapa: Record<string, number> = {};
    opsFiltradas.filter(o => o.estado === "EN_MORA").forEach(op => {
      const suc = op.sucursalId || "Sin sucursal";
      mapa[suc] = (mapa[suc] || 0) + 1;
    });
    return Object.entries(mapa).map(([suc, cant]) => ({ sucursal: suc.slice(0, 12), cant }));
  }, [opsFiltradas]);

  // ── Sucursales disponibles ──
  const sucursales = useMemo(() => {
    const set = new Set(ops.map(o => o.sucursalId).filter(Boolean));
    return Array.from(set) as string[];
  }, [ops]);

  // ── Exportar Excel ──
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const resumen = [
      ["Reporte de Producción", entidadData?.nombreFantasia || ""],
      ["Período", periodo === "todo" ? "Todo el tiempo" : `Últimos ${periodo}`],
      ["Generado", new Date().toLocaleDateString("es-AR")],
      [],
      ["Total Originado", totalMonto],
      ["Operaciones", totalOps],
      ["Aprobadas", aprobadas],
      ["Rechazadas", rechazadas],
      ["En Mora", enMora],
      ["Tasa Aprobación", `${tasaAprobacion}%`],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Resumen");

    // Hoja 2: Por Vendedor
    const vendedorRows = [
      ["Vendedor", "Operaciones", "Monto Originado", "Comisión Estimada"],
      ...porVendedor.map(v => [v.nombre, v.ops, v.monto, Math.round(v.comision)]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vendedorRows), "Por Vendedor");

    // Hoja 3: Detalle operaciones
    const detalle = [
      ["ID", "Cliente", "DNI", "Monto", "Estado", "Vendedor", "Fecha"],
      ...opsFiltradas.map(op => {
        const user = usuarios.find(u => u.id === op.vendedorId);
        return [
          op.id.slice(0, 8),
          op.cliente?.nombre || "",
          op.cliente?.dni || "",
          op.financiero?.montoSolicitado || 0,
          op.estado,
          user?.nombre || user?.email || "",
          op.fechaCreacion?.toDate?.()?.toLocaleDateString("es-AR") || "",
        ];
      }),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalle), "Detalle");

    // Anchos de columna
    [wb.Sheets["Por Vendedor"], wb.Sheets["Detalle"]].forEach(ws => {
      if (ws) ws["!cols"] = [20, 12, 20, 14, 16, 20, 14].map(w => ({ wch: w }));
    });

    XLSX.writeFile(wb, `Reporte_${entidadData?.nombreFantasia}_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.xlsx`);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="animate-spin text-gray-500" size={36} />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">Producción y desempeño de tu entidad</p>
        </div>
        <button onClick={exportarExcel}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white text-sm font-bold rounded-xl transition-colors">
          <Download size={16} /> Exportar Excel
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-3">
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {(["7d", "30d", "90d", "todo"] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-4 py-2 text-xs font-bold transition-colors ${
                periodo === p ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
              style={periodo === p ? { backgroundColor: colorPrimario } : {}}>
              {p === "7d" ? "7 días" : p === "30d" ? "30 días" : p === "90d" ? "90 días" : "Todo"}
            </button>
          ))}
        </div>
        {sucursales.length > 0 && (
          <select value={sucursalFiltro} onChange={e => setSucursalFiltro(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-gray-300 text-xs font-bold rounded-xl px-4 py-2 focus:outline-none">
            <option value="TODAS">Todas las sucursales</option>
            {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metricCard("Monto Originado", `$${(totalMonto / 1000).toFixed(0)}K`, <TrendingUp size={20} />, colorPrimario)}
        {metricCard("Operaciones", totalOps, <FileText size={20} />, "#3b82f6")}
        {metricCard("Aprobadas", aprobadas, <CheckCircle2 size={20} />, "#22c55e")}
        {metricCard("Rechazadas", rechazadas, <XCircle size={20} />, "#ef4444")}
        {metricCard("En Mora", enMora, <AlertTriangle size={20} />, "#f59e0b")}
      </div>

      {/* TASA APROBACIÓN */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Tasa de aprobación</p>
          <p className="text-lg font-black text-white">{tasaAprobacion}%</p>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${tasaAprobacion}%`, backgroundColor: colorPrimario }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* GRÁFICO: MONTO POR MES */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Monto originado por mes</p>
          {porMes.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porMes}>
                <XAxis dataKey="mes" tick={{ fill: "#6b7280", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }}
                  formatter={(v: number) => [`$${v.toLocaleString("es-AR")}`, "Monto"]}
                />
                <Bar dataKey="monto" fill={colorPrimario} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* GRÁFICO: PIE APROBACIÓN */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Distribución de estados</p>
          {pieData.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORES_GRAFICOS[i % COLORES_GRAFICOS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* MORA POR SUCURSAL */}
        {moraPorSucursal.length > 0 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Mora por sucursal</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={moraPorSucursal} layout="vertical">
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
                <YAxis dataKey="sucursal" type="category" tick={{ fill: "#6b7280", fontSize: 11 }} width={90} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }} />
                <Bar dataKey="cant" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* OPS POR VENDEDOR (gráfico) */}
        {porVendedor.length > 0 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Producción por vendedor</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={porVendedor.slice(0, 6)} layout="vertical">
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <YAxis dataKey="nombre" type="category" tick={{ fill: "#6b7280", fontSize: 11 }} width={80} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }}
                  formatter={(v: number) => [`$${v.toLocaleString("es-AR")}`, "Monto"]} />
                <Bar dataKey="monto" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* TABLA: RANKING VENDEDORES CON COMISIONES */}
      {porVendedor.length > 0 && (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Ranking de Vendedores</p>
          </div>
          <table className="w-full text-left">
            <thead className="border-b border-gray-900">
              <tr>
                {["#", "Vendedor", "Operaciones", "Monto Originado", "Comisión Estimada"].map(h => (
                  <th key={h} className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {porVendedor.map((v, i) => (
                <tr key={v.nombre} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-gray-500 font-bold text-sm">{i + 1}</td>
                  <td className="px-6 py-4 font-bold text-white text-sm">{v.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{v.ops}</td>
                  <td className="px-6 py-4 font-bold text-white">${v.monto.toLocaleString("es-AR")}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: colorPrimario }}>
                    ${Math.round(v.comision).toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
