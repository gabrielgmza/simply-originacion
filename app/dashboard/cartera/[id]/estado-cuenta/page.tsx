"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc, getDoc, collection, query,
  where, getDocs, orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft, CheckCircle2, Clock, AlertTriangle,
  Download, Loader2, DollarSign, Calendar, FileText
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Cuota {
  numero: number;
  vencimiento: Date;
  monto: number;
  estado: "PAGADA" | "VENCIDA" | "PENDIENTE";
  pagadaCon?: number; // monto que cubre esta cuota
}

interface Pago {
  id: string;
  monto: number;
  fecha: any;
  tipo: string;
  observacion?: string;
  registradoPor?: string;
}

const PUNITORIO_DIARIO = 0.0012;

function generarPlanCuotas(op: any, pagos: Pago[]): Cuota[] {
  const { valorCuota, cuotas } = op.financiero || {};
  if (!valorCuota || !cuotas) return [];

  const fechaLiquidacion = op.fechaLiquidacion?.toDate?.() || new Date();
  const totalPagado = pagos
    .filter(p => p.tipo !== "DEVOLUCION")
    .reduce((acc, p) => acc + p.monto, 0);

  let saldoDisponible = totalPagado;
  const hoy = new Date();

  return Array.from({ length: cuotas }, (_, i) => {
    const vencimiento = new Date(fechaLiquidacion);
    vencimiento.setMonth(vencimiento.getMonth() + i + 1);

    let estado: Cuota["estado"];
    let pagadaCon = 0;

    if (saldoDisponible >= valorCuota) {
      estado = "PAGADA";
      pagadaCon = valorCuota;
      saldoDisponible -= valorCuota;
    } else if (vencimiento < hoy) {
      estado = "VENCIDA";
    } else {
      estado = "PENDIENTE";
    }

    return { numero: i + 1, vencimiento, monto: valorCuota, estado, pagadaCon };
  });
}

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
export default function EstadoCuentaPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { entidadData } = useAuth();

  const [op, setOp] = useState<any>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  useEffect(() => {
    const cargar = async () => {
      try {
        const opSnap = await getDoc(doc(db, "operaciones", id));
        if (!opSnap.exists()) { router.push("/dashboard/cartera"); return; }
        setOp({ id: opSnap.id, ...opSnap.data() });

        const pagosSnap = await getDocs(
          query(collection(db, "pagos"),
            where("operacionId", "==", id),
            orderBy("fecha", "asc"))
        );
        setPagos(pagosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Pago)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    cargar();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-gray-500" size={32} />
    </div>
  );
  if (!op) return null;

  // ─── CÁLCULOS ───────────────────────────────────────────────────────────────
  const plan = generarPlanCuotas(op, pagos);
  const valorCuota = op.financiero?.valorCuota || 0;
  const totalCuotas = op.financiero?.cuotas || 0;
  const totalContrato = valorCuota * totalCuotas;

  const totalPagado = pagos
    .filter(p => p.tipo !== "DEVOLUCION")
    .reduce((acc, p) => acc + p.monto, 0);

  const cuotasPagadas = plan.filter(c => c.estado === "PAGADA").length;
  const cuotasVencidas = plan.filter(c => c.estado === "VENCIDA").length;
  const saldoPendiente = Math.max(0, totalContrato - totalPagado);
  const porcentaje = totalContrato > 0 ? Math.min(100, Math.round((totalPagado / totalContrato) * 100)) : 0;

  // Punitorio: 0.12% diario sobre capital por cuotas vencidas
  const diasMora = op.cobranzas?.diasMora || 0;
  const punitorio = Math.round(op.financiero?.montoSolicitado * PUNITORIO_DIARIO * diasMora);

  // ─── EXPORTAR PDF ───────────────────────────────────────────────────────────
  const exportarPDF = async () => {
    setExportando(true);
    try {
      const res = await fetch("/api/estado-cuenta/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId: id,
          entidadId: entidadData?.id,
        }),
      });
      if (!res.ok) throw new Error("Error al generar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estado-cuenta-${op.cliente?.nombre?.replace(/\s/g, "-")}-${id.slice(0, 6)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Error al generar el PDF.");
    } finally {
      setExportando(false);
    }
  };

  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const fmtFecha = (d: Date) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/dashboard/cartera/${id}`)}
          className="p-2 bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white">Estado de Cuenta</h1>
          <p className="text-gray-500 text-sm">{op.cliente?.nombre} · DNI {op.cliente?.dni}</p>
        </div>
        <button onClick={exportarPDF} disabled={exportando}
          className="flex items-center gap-2 px-4 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-50 transition-all"
          style={{ backgroundColor: colorPrimario }}>
          {exportando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Exportar PDF
        </button>
      </div>

      {/* BARRA DE PROGRESO */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
        <div className="flex justify-between items-end mb-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Cancelación del crédito</p>
            <p className="text-3xl font-black text-white mt-1">{porcentaje}%</p>
          </div>
          <p className="text-sm text-gray-500">{cuotasPagadas} de {totalCuotas} cuotas</p>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <div className="h-3 rounded-full transition-all duration-700"
            style={{ width: `${porcentaje}%`, backgroundColor: colorPrimario }} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Total contrato",  valor: fmt(totalContrato),   color: "text-white" },
            { label: "Total pagado",    valor: fmt(totalPagado),     color: "text-green-400" },
            { label: "Saldo pendiente", valor: fmt(saldoPendiente),  color: saldoPendiente > 0 ? "text-yellow-400" : "text-green-400" },
          ].map((k, i) => (
            <div key={i} className="bg-gray-900/60 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase mb-1">{k.label}</p>
              <p className={`font-black text-base ${k.color}`}>{k.valor}</p>
            </div>
          ))}
        </div>

        {/* Punitorio si hay mora */}
        {diasMora > 0 && punitorio > 0 && (
          <div className="mt-4 flex items-center justify-between bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400" />
              <span className="text-xs font-bold text-red-400">Punitorio acumulado ({diasMora} días × 0.12% diario)</span>
            </div>
            <span className="font-black text-red-400">+{fmt(punitorio)}</span>
          </div>
        )}
      </div>

      {/* PLAN DE CUOTAS */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2">
            <Calendar size={13} /> Plan de cuotas
          </p>
          <div className="flex items-center gap-3 text-[10px] text-gray-600 font-bold uppercase">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Pagada</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Vencida</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600 inline-block"/>Pendiente</span>
          </div>
        </div>
        <div className="divide-y divide-gray-900 max-h-80 overflow-y-auto">
          {plan.map(c => (
            <div key={c.numero} className={`flex items-center gap-4 px-5 py-3 ${c.estado === "VENCIDA" ? "bg-red-900/10" : ""}`}>
              {/* Ícono estado */}
              <div className="shrink-0">
                {c.estado === "PAGADA"   && <CheckCircle2 size={18} className="text-green-500" />}
                {c.estado === "VENCIDA"  && <AlertTriangle size={18} className="text-red-400" />}
                {c.estado === "PENDIENTE" && <Clock size={18} className="text-gray-600" />}
              </div>
              {/* Número cuota */}
              <span className="text-xs font-black text-gray-500 w-8 shrink-0">#{c.numero}</span>
              {/* Vencimiento */}
              <span className="text-xs text-gray-400 flex-1">{fmtFecha(c.vencimiento)}</span>
              {/* Monto */}
              <span className={`text-sm font-bold ${
                c.estado === "PAGADA"   ? "text-green-400" :
                c.estado === "VENCIDA"  ? "text-red-400"   : "text-gray-400"
              }`}>{fmt(c.monto)}</span>
              {/* Badge */}
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                c.estado === "PAGADA"    ? "bg-green-900/40 text-green-400" :
                c.estado === "VENCIDA"   ? "bg-red-900/40 text-red-400"    :
                "bg-gray-800 text-gray-500"
              }`}>{c.estado}</span>
            </div>
          ))}
        </div>
      </div>

      {/* HISTORIAL DE PAGOS */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2">
            <DollarSign size={13} /> Pagos registrados ({pagos.length})
          </p>
        </div>
        {pagos.length === 0 ? (
          <div className="py-10 text-center text-gray-600 text-sm">Sin pagos registrados</div>
        ) : (
          <div className="divide-y divide-gray-900">
            {pagos.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="p-2 bg-green-900/20 rounded-lg shrink-0">
                  <DollarSign size={14} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{fmt(p.monto)}</p>
                  <p className="text-xs text-gray-500">
                    {p.tipo} · {p.fecha?.toDate?.()?.toLocaleDateString("es-AR") || "—"}
                    {p.observacion ? ` · ${p.observacion}` : ""}
                  </p>
                </div>
                <span className="text-[10px] text-gray-600">{p.registradoPor}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
