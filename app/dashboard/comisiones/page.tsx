"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  DollarSign, TrendingUp, Users, CheckCircle2, Clock,
  Loader2, Download, ChevronDown, Filter
} from "lucide-react";
import * as XLSX from "xlsx";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

interface Comision {
  id: string;
  operacionId: string;
  vendedorId: string;
  montoOperacion: number;
  montoComision: number;
  porcentaje: number;
  producto: string;
  clienteNombre: string;
  estado: "PENDIENTE" | "PAGADA";
  mes: string;
  fechaCreacion: any;
}

export default function ComisionesPage() {
  const { userData, entidadData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [usuarios, setUsuarios]     = useState<any[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7));
  const [filtroVendedor, setFiltroVendedor]   = useState("TODOS");
  const [filtroEstado, setFiltroEstado]       = useState("TODOS");
  const [marcando, setMarcando] = useState(false);

  const esGerente = ["GERENTE_GENERAL", "GERENTE_SUCURSAL", "MASTER_PAYSUR"].includes(userData?.rol || "");
  const esVendedor = userData?.rol === "VENDEDOR";

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      setCargando(true);
      try {
        // Comisiones del mes
        const comSnap = await getDocs(
          query(collection(db, "comisiones"),
            where("entidadId", "==", entidadData.id),
            where("mes", "==", mesSeleccionado))
        );
        let coms = comSnap.docs.map(d => ({ id: d.id, ...d.data() } as Comision));

        // Si es vendedor, solo ver las suyas
        if (esVendedor) coms = coms.filter(c => c.vendedorId === userData?.uid);

        setComisiones(coms);

        // Usuarios (para el filtro del gerente)
        if (esGerente) {
          const usSnap = await getDocs(
            query(collection(db, "usuarios"),
              where("entidadId", "==", entidadData.id),
              where("activo", "==", true))
          );
          setUsuarios(usSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) { console.error(e); }
      finally { setCargando(false); }
    };
    cargar();
  }, [entidadData, mesSeleccionado, userData]);

  // Filtros
  const comsFiltradas = useMemo(() => {
    let lista = comisiones;
    if (filtroVendedor !== "TODOS") lista = lista.filter(c => c.vendedorId === filtroVendedor);
    if (filtroEstado !== "TODOS") lista = lista.filter(c => c.estado === filtroEstado);
    return lista;
  }, [comisiones, filtroVendedor, filtroEstado]);

  // KPIs
  const kpis = useMemo(() => ({
    totalComisiones:  comsFiltradas.reduce((a, c) => a + c.montoComision, 0),
    totalPendientes:  comsFiltradas.filter(c => c.estado === "PENDIENTE").reduce((a, c) => a + c.montoComision, 0),
    totalPagadas:     comsFiltradas.filter(c => c.estado === "PAGADA").reduce((a, c) => a + c.montoComision, 0),
    operaciones:      comsFiltradas.length,
    montoOriginado:   comsFiltradas.reduce((a, c) => a + c.montoOperacion, 0),
  }), [comsFiltradas]);

  // Marcar como pagadas
  const marcarPagadas = async () => {
    const pendientes = comsFiltradas.filter(c => c.estado === "PENDIENTE");
    if (pendientes.length === 0) return;
    if (!confirm(`¿Marcar ${pendientes.length} comisiones como PAGADAS?`)) return;
    setMarcando(true);
    try {
      for (const c of pendientes) {
        await updateDoc(doc(db, "comisiones", c.id), {
          estado: "PAGADA",
          fechaPago: serverTimestamp(),
        });
        await updateDoc(doc(db, "operaciones", c.operacionId), {
          "comision.estado": "PAGADA",
        });
      }
      setComisiones(prev => prev.map(c =>
        pendientes.find(p => p.id === c.id) ? { ...c, estado: "PAGADA" as const } : c
      ));
    } catch { alert("Error al marcar comisiones."); }
    finally { setMarcando(false); }
  };

  // Exportar Excel
  const exportar = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Vendedor", "Cliente", "Producto", "Monto Op", "Comisión %", "Comisión $", "Estado", "Fecha"],
      ...comsFiltradas.map(c => [
        usuarios.find(u => u.id === c.vendedorId)?.nombre || c.vendedorId?.slice(0, 8),
        c.clienteNombre,
        c.producto,
        c.montoOperacion,
        c.porcentaje + "%",
        c.montoComision,
        c.estado,
        c.fechaCreacion?.toDate?.()?.toLocaleDateString("es-AR") || "—",
      ])
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Comisiones");
    XLSX.writeFile(wb, `comisiones-${mesSeleccionado}.xlsx`);
  };

  // Meses disponibles (últimos 12)
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  const nombreVendedor = (id: string) => usuarios.find(u => u.id === id)?.nombre || id?.slice(0, 8);

  if (cargando) return (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">
            {esVendedor ? "Mi Producción" : "Comisiones"}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {esVendedor ? "Tu producción y comisiones del mes" : "Comisiones del equipo de ventas"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportar}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-sm font-bold">
            <Download size={13} /> Excel
          </button>
          {esGerente && kpis.totalPendientes > 0 && (
            <button onClick={marcarPagadas} disabled={marcando}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: colorPrimario }}>
              {marcando ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Pagar pendientes ({fmt(kpis.totalPendientes)})
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select value={mesSeleccionado} onChange={e => setMesSeleccionado(e.target.value)}
          className="bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm font-bold">
          {meses.map(m => (
            <option key={m} value={m}>
              {new Date(m + "-01").toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>

        {esGerente && (
          <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
            className="bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm font-bold">
            <option value="TODOS">Todos los vendedores</option>
            {usuarios.filter(u => ["VENDEDOR", "GERENTE_SUCURSAL"].includes(u.rol)).map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        )}

        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm font-bold">
          <option value="TODOS">Todos los estados</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="PAGADA">Pagadas</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Comisión total",  valor: fmt(kpis.totalComisiones),  icon: <DollarSign size={18} />, color: "text-green-400" },
          { label: "Pendiente pago",  valor: fmt(kpis.totalPendientes),  icon: <Clock size={18} />,      color: "text-yellow-400" },
          { label: "Operaciones",     valor: kpis.operaciones,           icon: <TrendingUp size={18} />, color: "text-blue-400" },
          { label: "Monto originado", valor: fmt(kpis.montoOriginado),   icon: <DollarSign size={18} />, color: "text-white" },
        ].map(k => (
          <div key={k.label} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <div className={`${k.color} mb-2`}>{k.icon}</div>
            <p className="text-2xl font-black text-white">{k.valor}</p>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {comsFiltradas.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <DollarSign size={40} className="mx-auto mb-3 opacity-20" />
          <p>No hay comisiones para este período.</p>
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-gray-900">
              <tr>
                {[...(esGerente ? ["Vendedor"] : []), "Cliente", "Producto", "Monto Op", "Com %", "Comisión", "Estado"].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {comsFiltradas.map(c => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  {esGerente && (
                    <td className="px-5 py-3 text-sm font-bold text-white">{nombreVendedor(c.vendedorId)}</td>
                  )}
                  <td className="px-5 py-3">
                    <p className="text-sm font-bold text-white">{c.clienteNombre}</p>
                    <p className="text-[10px] text-gray-600 font-mono">{c.operacionId?.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                      c.producto === "CUAD" ? "bg-purple-900/30 text-purple-400" :
                      c.producto === "ADELANTO" ? "bg-green-900/30 text-green-400" :
                      "bg-blue-900/30 text-blue-400"
                    }`}>{c.producto}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-300 font-mono">{fmt(c.montoOperacion)}</td>
                  <td className="px-5 py-3 text-sm text-gray-400 font-bold">{c.porcentaje}%</td>
                  <td className="px-5 py-3 text-sm font-black text-green-400">{fmt(c.montoComision)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                      c.estado === "PAGADA" ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"
                    }`}>{c.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resumen por vendedor (solo gerente) */}
      {esGerente && filtroVendedor === "TODOS" && comisiones.length > 0 && (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-4">Resumen por vendedor</p>
          <div className="space-y-2">
            {Object.entries(
              comisiones.reduce((acc, c) => {
                if (!acc[c.vendedorId]) acc[c.vendedorId] = { ops: 0, monto: 0, comision: 0, pendiente: 0 };
                acc[c.vendedorId].ops++;
                acc[c.vendedorId].monto += c.montoOperacion;
                acc[c.vendedorId].comision += c.montoComision;
                if (c.estado === "PENDIENTE") acc[c.vendedorId].pendiente += c.montoComision;
                return acc;
              }, {} as Record<string, any>)
            ).sort((a, b) => b[1].comision - a[1].comision).map(([vid, data]) => (
              <div key={vid} className="flex items-center justify-between py-2 border-b border-gray-900 last:border-0">
                <div>
                  <p className="text-sm font-bold text-white">{nombreVendedor(vid)}</p>
                  <p className="text-xs text-gray-500">{data.ops} ops · {fmt(data.monto)} originado</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-green-400">{fmt(data.comision)}</p>
                  {data.pendiente > 0 && (
                    <p className="text-[10px] text-yellow-500">{fmt(data.pendiente)} pendiente</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
