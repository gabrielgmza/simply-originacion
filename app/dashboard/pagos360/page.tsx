"use client";
// app/dashboard/pagos360/page.tsx
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import * as XLSX from "xlsx";
import {
  CreditCard, Link, Play, RefreshCw, Download,
  CheckCircle2, XCircle, Clock, AlertTriangle,
  Loader2, Search, Filter, ChevronRight
} from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const ESTADO_P360: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  SIN_ADHESION:         { label: "Sin adhesión",    color: "text-gray-400",   bg: "bg-gray-900/20",   icon: CreditCard  },
  ADHERIDO:             { label: "Adherido",        color: "text-blue-400",   bg: "bg-blue-900/20",   icon: Link        },
  PENDIENTE:            { label: "Pendiente",       color: "text-yellow-400", bg: "bg-yellow-900/20", icon: Clock       },
  COBRADO:              { label: "Cobrado",         color: "text-green-400",  bg: "bg-green-900/20",  icon: CheckCircle2},
  RECHAZADO:            { label: "Rechazado",       color: "text-red-400",    bg: "bg-red-900/20",    icon: XCircle     },
  RECHAZADO_DEFINITIVO: { label: "Mora",            color: "text-red-400",    bg: "bg-red-900/20",    icon: AlertTriangle},
  REINTENTO_PROGRAMADO: { label: "Reintento prog.", color: "text-orange-400", bg: "bg-orange-900/20", icon: RefreshCw   },
};

export default function Pagos360Page() {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [ops,           setOps]           = useState<any[]>([]);
  const [cargando,      setCargando]      = useState(true);
  const [hayApiKey,     setHayApiKey]     = useState(false);
  const [filtroEstado,  setFiltroEstado]  = useState("TODOS");
  const [busqueda,      setBusqueda]      = useState("");
  const [accionando,    setAccionando]    = useState<string | null>(null);

  // KPIs
  const [kpis, setKpis] = useState({ total: 0, adheridas: 0, cobradas: 0, rechazadas: 0, montoMes: 0 });

  const cargar = async () => {
    if (!entidadData?.id) return;
    setCargando(true);

    const entSnap = await getDoc(doc(db, "entidades", entidadData.id));
    const apiKey  = entSnap.data()?.configuracion?.pagos360?.apiKey;
    setHayApiKey(!!apiKey);

    const snap = await getDocs(
      query(collection(db, "operaciones"),
        where("entidadId", "==", entidadData.id),
        where("estado",    "in", ["LIQUIDADO","REINTENTO_PROGRAMADO","EN_MORA","FINALIZADO"]))
    );

    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    setOps(lista);

    // KPIs
    const mes = new Date().getMonth();
    const pagosSnap = await getDocs(
      query(collection(db, "pagos"),
        where("entidadId", "==", entidadData.id),
        where("origen",    "==", "PAGOS360"))
    );
    const pagosMes = pagosSnap.docs
      .filter(d => { const f = d.data().fecha?.toDate?.(); return f && f.getMonth() === mes; })
      .reduce((a, d) => a + (d.data().monto || 0), 0);

    setKpis({
      total:      lista.length,
      adheridas:  lista.filter(o => o.pagos360?.estadoAdhesion === "ADHERIDO").length,
      cobradas:   lista.filter(o => o.pagos360?.ultimoEstado   === "COBRADO").length,
      rechazadas: lista.filter(o => ["RECHAZADO","RECHAZADO_DEFINITIVO"].includes(o.pagos360?.ultimoEstado)).length,
      montoMes:   pagosMes,
    });

    setCargando(false);
  };

  useEffect(() => { cargar(); }, [entidadData]);

  // Filtrar
  const opsFiltradas = useMemo(() => {
    let lista = [...ops];
    if (filtroEstado !== "TODOS") {
      lista = lista.filter(o => {
        const est = o.pagos360?.ultimoEstado || (o.pagos360?.estadoAdhesion ? "ADHERIDO" : "SIN_ADHESION");
        return est === filtroEstado;
      });
    }
    if (busqueda) {
      const b = busqueda.toLowerCase();
      lista = lista.filter(o =>
        o.cliente?.nombre?.toLowerCase().includes(b) ||
        o.cliente?.dni?.includes(b)
      );
    }
    return lista;
  }, [ops, filtroEstado, busqueda]);

  // Adherir CBU
  const adherir = async (op: any) => {
    setAccionando(op.id);
    try {
      const res = await fetch("/api/pagos360", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "ADHERIR", operacionId: op.id, entidadId: entidadData?.id, usuarioEmail: userData?.email }),
      });
      const data = await res.json();
      if (!data.success) alert("Error: " + (data.error || "desconocido"));
      else cargar();
    } finally { setAccionando(null); }
  };

  // Cobrar manualmente
  const cobrar = async (op: any) => {
    if (!confirm(`¿Iniciar cobro de ${fmt(op.financiero?.valorCuota || 0)} para ${op.cliente?.nombre}?`)) return;
    setAccionando(op.id);
    try {
      const res = await fetch("/api/pagos360", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "COBRAR", operacionId: op.id, entidadId: entidadData?.id, usuarioEmail: userData?.email }),
      });
      const data = await res.json();
      if (!data.success) alert("Error: " + (data.error || "desconocido"));
      else cargar();
    } finally { setAccionando(null); }
  };

  // Exportar reporte del mes
  const exportarReporte = async () => {
    const pagosSnap = await getDocs(
      query(collection(db, "pagos"),
        where("entidadId", "==", entidadData?.id),
        where("origen",    "==", "PAGOS360"))
    );
    const pagos = pagosSnap.docs.map(d => d.data());

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Operación","Cliente","Monto","Cuota Nro","Estado","Fecha"],
      ...pagos.map(p => [
        p.operacionId?.slice(0,8).toUpperCase(),
        ops.find(o => o.id === p.operacionId)?.cliente?.nombre || "—",
        p.monto, p.nroCuota, p.estado,
        p.fecha?.toDate?.()?.toLocaleDateString("es-AR") || "—",
      ])
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Cobros P360");
    XLSX.writeFile(wb, `pagos360-${new Date().toISOString().slice(0,7)}.xlsx`);
  };

  const estadoOp = (op: any) => {
    const e = op.pagos360?.ultimoEstado || (op.pagos360?.estadoAdhesion ? "ADHERIDO" : "SIN_ADHESION");
    return ESTADO_P360[e] || ESTADO_P360["SIN_ADHESION"];
  };

  if (cargando) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-gray-600" size={22}/></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <CreditCard size={22} style={{ color: colorPrimario }}/> Pagos 360
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestión de adhesiones y cobros automáticos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-sm font-bold">
            <RefreshCw size={13}/> Actualizar
          </button>
          <button onClick={exportarReporte} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-bold text-sm" style={{ backgroundColor: colorPrimario }}>
            <Download size={13}/> Reporte Excel
          </button>
        </div>
      </div>

      {/* Aviso sin API Key */}
      {!hayApiKey && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-yellow-900/10 border border-yellow-900/40 text-yellow-400">
          <AlertTriangle size={16}/>
          <p className="text-sm">No hay API Key de Pagos 360 configurada. Ingresala en <strong>Configuración → Financiera</strong>.</p>
          <a href="/dashboard/configuracion" className="ml-auto text-xs font-bold underline flex items-center gap-1">
            Configurar <ChevronRight size={11}/>
          </a>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total ops",   valor: kpis.total,                       color: "text-white"        },
          { label: "Adheridas",   valor: kpis.adheridas,                   color: "text-blue-400"     },
          { label: "Cobradas",    valor: kpis.cobradas,                    color: "text-green-400"    },
          { label: "Rechazadas",  valor: kpis.rechazadas,                  color: "text-red-400"      },
          { label: "Cobrado/mes", valor: fmt(kpis.montoMes),               color: "text-purple-400"   },
        ].map((k, i) => (
          <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4">
            <p className={`text-xl font-black ${k.color}`}>{k.valor}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar cliente o DNI..."
            className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none"/>
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="bg-[#0A0A0A] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="TODOS">Todos los estados</option>
          {Object.entries(ESTADO_P360).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] text-gray-600 uppercase font-bold tracking-widest border-b border-gray-900">
          <div className="col-span-3">Cliente</div>
          <div className="col-span-2 text-right">Cuota</div>
          <div className="col-span-2">Estado P360</div>
          <div className="col-span-2">CBU</div>
          <div className="col-span-3 text-right">Acciones</div>
        </div>

        <div className="divide-y divide-gray-900 max-h-[520px] overflow-y-auto">
          {opsFiltradas.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">No hay operaciones.</div>
          )}
          {opsFiltradas.map(op => {
            const est = estadoOp(op);
            const Icon = est.icon;
            const esAccionando = accionando === op.id;
            const adherida = op.pagos360?.estadoAdhesion === "ADHERIDO";

            return (
              <div key={op.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-white/5 transition-all">
                <div className="col-span-3">
                  <p className="text-sm font-bold text-white truncate">{op.cliente?.nombre}</p>
                  <p className="text-[10px] text-gray-600">DNI {op.cliente?.dni}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm font-black text-white">{fmt(op.financiero?.valorCuota || 0)}</p>
                  <p className="text-[10px] text-gray-600">{op.pagos360?.cuotasPagadas || 0}/{op.financiero?.cuotas || "?"} pagadas</p>
                </div>
                <div className="col-span-2">
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full w-fit ${est.color} ${est.bg}`}>
                    <Icon size={10}/>{est.label}
                  </span>
                  {op.pagos360?.motivo && (
                    <p className="text-[9px] text-gray-600 mt-0.5 truncate max-w-[100px]" title={op.pagos360.motivo}>
                      {op.pagos360.motivo}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 font-mono">
                    {op.cliente?.cbu ? `****${op.cliente.cbu.slice(-4)}` : <span className="text-red-400 text-[10px]">Sin CBU</span>}
                  </p>
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  {!adherida && op.cliente?.cbu && hayApiKey && (
                    <button onClick={() => adherir(op)} disabled={!!accionando}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 transition-all"
                      style={{ backgroundColor: colorPrimario }}>
                      {esAccionando ? <Loader2 size={11} className="animate-spin"/> : <Link size={11}/>}
                      Adherir
                    </button>
                  )}
                  {adherida && !["RECHAZADO_DEFINITIVO","FINALIZADO"].includes(op.pagos360?.ultimoEstado || "") && hayApiKey && (
                    <button onClick={() => cobrar(op)} disabled={!!accionando}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-900/60 text-green-400 hover:bg-green-900/20 disabled:opacity-50 transition-all">
                      {esAccionando ? <Loader2 size={11} className="animate-spin"/> : <Play size={11}/>}
                      Cobrar
                    </button>
                  )}
                  {op.pagos360?.fechaProxReintento && (
                    <p className="text-[10px] text-orange-400">
                      {new Date(op.pagos360.fechaProxReintento).toLocaleDateString("es-AR")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
