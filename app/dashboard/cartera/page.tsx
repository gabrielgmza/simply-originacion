"use client";
import ExportarLegajosMasivo from "@/components/ExportarLegajosMasivo";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Search, Filter, ChevronRight, Download,
  AlertTriangle, Clock, CheckCircle2, Loader2,
  TrendingUp, Banknote, Users, AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx";

type EstadoOp = "APROBADO" | "LIQUIDADO" | "EN_MORA" | "FINALIZADO" | "RECHAZADO" | string;

interface Operacion {
  id: string;
  estado: EstadoOp;
  estadoAprobacion?: string;
  cliente?: { nombre?: string; dni?: string };
  financiero?: {
    montoSolicitado?: number;
    cuotas?: number;
    valorCuota?: number;
  };
  fechaCreacion?: any;
  fechaLiquidacion?: any;
  cobranzas?: { diasMora?: number };
}

const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
  APROBADO:    { label: "Aprobado",   className: "bg-blue-900/30 text-blue-400 border-blue-800/50" },
  LIQUIDADO:   { label: "Liquidado",  className: "bg-green-900/30 text-green-400 border-green-800/50" },
  EN_MORA:     { label: "En Mora",    className: "bg-red-900/30 text-red-400 border-red-800/50" },
  FINALIZADO:  { label: "Finalizado", className: "bg-gray-700/50 text-gray-400 border-gray-600/50" },
  RECHAZADO:   { label: "Rechazado",  className: "bg-orange-900/30 text-orange-400 border-orange-800/50" },
  PENDIENTE_APROBACION: { label: "Pendiente", className: "bg-yellow-900/30 text-yellow-400 border-yellow-800/50" },
};

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, className: "bg-gray-800 text-gray-400 border-gray-700" };
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export default function CarteraPage() {
  const { entidadData } = useAuth();
  const router = useRouter();
  const [ops, setOps] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda]     = useState("");
  const [sucursales, setSucursales]   = useState<any[]>([]);
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("TODAS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, "operaciones"),
          where("entidadId", "==", entidadData.id),
          orderBy("fechaCreacion", "desc")
        );
        const snap = await getDocs(q);
        setOps(snap.docs.map(d => ({ id: d.id, ...d.data() } as Operacion)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [entidadData]);

  // ── Filtros ──
  const opsFiltradas = ops.filter(op => {
    const matchBusqueda =
      op.cliente?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      op.cliente?.dni?.includes(busqueda);
    const matchEstado = filtroEstado === "TODOS" || op.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  // ── Métricas ──
  const totalCartera = ops.reduce((acc, o) => acc + (o.financiero?.montoSolicitado || 0), 0);
  const enMora = ops.filter(o => o.estado === "EN_MORA").length;
  const liquidadas = ops.filter(o => o.estado === "LIQUIDADO").length;

  // ── Exportar Excel ──
  const exportarExcel = () => {
    const filas = opsFiltradas.map(op => ({
      "ID": op.id.slice(0, 8),
      "Cliente": op.cliente?.nombre || "",
      "DNI": op.cliente?.dni || "",
      "Monto": op.financiero?.montoSolicitado || 0,
      "Cuotas": op.financiero?.cuotas || 0,
      "Cuota $": op.financiero?.valorCuota || 0,
      "Estado": op.estado || "",
      "Mora (días)": op.cobranzas?.diasMora || 0,
      "Fecha": op.fechaCreacion?.toDate?.()?.toLocaleDateString("es-AR") || "",
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = [8, 30, 14, 14, 10, 14, 16, 14, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cartera");
    XLSX.writeFile(wb, `Cartera_${entidadData?.nombreFantasia}_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.xlsx`);
  };

  const filtros = ["TODOS", "APROBADO", "LIQUIDADO", "EN_MORA", "FINALIZADO"];

  return (
    <div className="animate-in fade-in duration-500 space-y-8">

      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Cartera Activa</h1>
          <p className="text-gray-500 text-sm mt-1">{ops.length} operaciones totales</p>
        </div>
        <button onClick={exportarExcel}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white text-sm font-bold rounded-xl transition-colors">
          <Download size={16} /> Exportar Excel
        </button>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Cartera", valor: `$${totalCartera.toLocaleString("es-AR")}`, icono: <Banknote size={20} />, color: colorPrimario },
          { label: "Operaciones", valor: ops.length, icono: <Users size={20} />, color: "#3b82f6" },
          { label: "Liquidadas", valor: liquidadas, icono: <CheckCircle2 size={20} />, color: "#22c55e" },
          { label: "En Mora", valor: enMora, icono: <AlertTriangle size={20} />, color: "#ef4444" },
        ].map((m, i) => (
          <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2" style={{ color: m.color }}>{m.icono}</div>
            <p className="text-xl font-black text-white">{m.valor}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Search size={16} className="text-gray-500" />
          <input
            placeholder="Buscar por nombre o DNI..."
            className="bg-transparent text-sm outline-none text-white flex-1"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filtros.map(f => (
            <button key={f} onClick={() => setFiltroEstado(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                filtroEstado === f ? "text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
              style={filtroEstado === f ? { backgroundColor: colorPrimario } : {}}>
              {f === "TODOS" ? "Todos" : ESTADO_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-500" size={32} />
        </div>
      ) : opsFiltradas.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <AlertCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay operaciones que coincidan.</p>
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-gray-900">
              <tr>
                {["Cliente", "Monto", "Cuotas", "Estado", "Mora", ""].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {opsFiltradas.map(op => (
                <tr key={op.id}
                  className="hover:bg-white/[0.02] cursor-pointer group transition-all"
                  onClick={() => router.push(`/dashboard/cartera/${op.id}`)}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-white group-hover:text-blue-400 transition-colors">
                      {op.cliente?.nombre || "Sin nombre"}
                    </p>
                    <p className="text-xs text-gray-600 font-mono mt-0.5">{op.cliente?.dni}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-white">${(op.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}</p>
                    <p className="text-xs text-gray-600">cuota ${(op.financiero?.valorCuota || 0).toLocaleString("es-AR")}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 font-bold">{op.financiero?.cuotas || "—"}</td>
                  <td className="px-6 py-4"><EstadoBadge estado={op.estado || ""} /></td>
                  <td className="px-6 py-4">
                    {op.estado === "EN_MORA" ? (
                      <span className="text-red-400 font-bold text-sm flex items-center gap-1">
                        <AlertTriangle size={14} /> {op.cobranzas?.diasMora || "?"} días
                      </span>
                    ) : (
                      <span className="text-gray-700 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-gray-600 group-hover:text-white group-hover:bg-blue-600 transition-all ml-auto">
                      <ChevronRight size={16} />
                    </div>
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
