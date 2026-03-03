"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc, getDoc, collection, query,
  where, getDocs, orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import CertificadosWidget from "@/components/CertificadosWidget";
import {
  ArrowLeft, User, DollarSign, Calendar, FileText,
  CheckCircle2, AlertTriangle, Clock, Loader2,
  MapPin, Shield, ChevronRight
} from "lucide-react";

const ESTADO_COLORS: Record<string, string> = {
  LIQUIDADO:           "bg-blue-900/30 text-blue-400",
  EN_MORA:             "bg-red-900/30 text-red-400",
  FINALIZADO:          "bg-green-900/30 text-green-400",
  APROBADO:            "bg-purple-900/30 text-purple-400",
  RECHAZADO:           "bg-gray-800 text-gray-500",
  EN_REVISION:         "bg-yellow-900/30 text-yellow-400",
  PENDIENTE_APROBACION:"bg-orange-900/30 text-orange-400",
};

export default function DetalleOperacionPage() {
  const { id }          = useParams() as { id: string };
  const router          = useRouter();
  const { entidadData, userData } = useAuth();

  const [op, setOp]           = useState<any>(null);
  const [pagos, setPagos]     = useState<any[]>([]);
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  useEffect(() => {
    const cargar = async () => {
      if (!id) return;
      try {
        const [opSnap, pagosSnap, logsSnap] = await Promise.all([
          getDoc(doc(db, "operaciones", id)),
          getDocs(query(collection(db, "pagos"), where("operacionId", "==", id), orderBy("fecha", "desc"))),
          getDocs(query(collection(db, "auditoria"), where("operacionId", "==", id), orderBy("fecha", "desc"))),
        ]);
        if (opSnap.exists()) setOp({ id: opSnap.id, ...opSnap.data() });
        setPagos(pagosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    cargar();
  }, [id]);

  // ── Plan de cuotas ──
  const plan = (() => {
    if (!op) return [];
    const { valorCuota, cuotas } = op.financiero || {};
    if (!valorCuota || !cuotas) return [];
    const fechaLiq = op.fechaLiquidacion?.toDate?.() || new Date();
    const totalPagado = pagos
      .filter((p: any) => p.tipo !== "DEVOLUCION")
      .reduce((a: number, p: any) => a + p.monto, 0);
    let saldo = totalPagado;
    const hoy = new Date();
    return Array.from({ length: cuotas }, (_, i) => {
      const venc = new Date(fechaLiq);
      venc.setMonth(venc.getMonth() + i + 1);
      let estado = "PENDIENTE";
      if (saldo >= valorCuota) { estado = "PAGADA"; saldo -= valorCuota; }
      else if (venc < hoy)     { estado = "VENCIDA"; }
      return { numero: i + 1, vencimiento: venc.toLocaleDateString("es-AR"), monto: valorCuota, estado };
    });
  })();

  const totalPagado   = pagos.filter(p => p.tipo !== "DEVOLUCION").reduce((a, p) => a + p.monto, 0);
  const totalContrato = (op?.financiero?.valorCuota || 0) * (op?.financiero?.cuotas || 0);
  const saldo         = Math.max(0, totalContrato - totalPagado);
  const porcAvance    = totalContrato > 0 ? Math.min(100, (totalPagado / totalContrato) * 100) : 0;

  const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

  if (loading) return (
    <div className="flex justify-center py-32"><Loader2 className="animate-spin text-gray-600" size={28} /></div>
  );
  if (!op) return (
    <div className="text-center py-32 text-gray-500">Operación no encontrada</div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white">{op.cliente?.nombre}</h1>
          <p className="text-gray-500 text-sm">DNI {op.cliente?.dni} · CUIL {op.cliente?.cuil}</p>
        </div>
        <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-full ${ESTADO_COLORS[op.estado] || "bg-gray-800 text-gray-400"}`}>
          {op.estado?.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-5">

          {/* Resumen financiero */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Resumen financiero</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {[
                { l: "Monto otorgado",  v: fmt(op.financiero?.montoSolicitado || 0), c: "text-white" },
                { l: "Cuota",           v: fmt(op.financiero?.valorCuota || 0),       c: "text-white" },
                { l: "TNA",             v: `${op.financiero?.tna || 0}%`,             c: "text-blue-400" },
                { l: "Total contrato",  v: fmt(totalContrato),                        c: "text-white" },
                { l: "Total pagado",    v: fmt(totalPagado),                          c: "text-green-400" },
                { l: "Saldo pendiente", v: fmt(saldo),                                c: saldo > 0 ? "text-orange-400" : "text-green-400" },
              ].map((k, i) => (
                <div key={i} className="bg-gray-900/50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase">{k.l}</p>
                  <p className={`font-black text-sm mt-0.5 ${k.c}`}>{k.v}</p>
                </div>
              ))}
            </div>
            {/* Barra de avance */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Avance de cancelación</span>
                <span className="font-bold">{porcAvance.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${porcAvance}%`, backgroundColor: colorPrimario }} />
              </div>
            </div>
          </div>

          {/* Plan de cuotas */}
          {plan.length > 0 && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">
                Plan de cuotas ({plan.filter(c => c.estado === "PAGADA").length}/{plan.length} pagadas)
              </p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {plan.map(c => (
                  <div key={c.numero}
                    className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm ${
                      c.estado === "PAGADA"  ? "bg-green-900/10 border border-green-900/20" :
                      c.estado === "VENCIDA" ? "bg-red-900/10 border border-red-900/20" :
                      "bg-gray-900/40"}`}>
                    <span className="font-bold text-white w-8">#{c.numero}</span>
                    <span className="text-gray-400 text-xs">{c.vencimiento}</span>
                    <span className="font-bold text-white">{fmt(c.monto)}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      c.estado === "PAGADA"  ? "text-green-400" :
                      c.estado === "VENCIDA" ? "text-red-400" : "text-gray-500"}`}>
                      {c.estado}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial de pagos */}
          {pagos.length > 0 && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Historial de pagos</p>
              <div className="space-y-1.5">
                {pagos.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2 bg-gray-900/40 rounded-xl">
                    <span className="text-xs text-gray-400">{p.fecha?.toDate?.()?.toLocaleDateString("es-AR") || "—"}</span>
                    <span className="font-bold text-green-400 text-sm">{fmt(p.monto)}</span>
                    <span className="text-[10px] text-gray-500 uppercase">{p.metodo || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auditoría */}
          {logs.length > 0 && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Auditoría</p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {logs.map(l => (
                  <div key={l.id} className="flex gap-3 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">{l.accion?.replace(/_/g, " ")}</p>
                      <p className="text-[11px] text-gray-500">{l.detalles}</p>
                      <p className="text-[10px] text-gray-600">{l.fecha?.toDate?.()?.toLocaleString("es-AR") || "—"} · {l.usuarioEmail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-5">

          {/* Mora */}
          {op.cobranzas?.diasMora > 0 && (
            <div className="bg-red-900/10 border border-red-900/30 rounded-2xl p-5">
              <p className="text-xs text-red-400 uppercase font-bold mb-3 flex items-center gap-1.5">
                <AlertTriangle size={13} /> En mora
              </p>
              <p className="text-3xl font-black text-red-400">{op.cobranzas.diasMora} días</p>
              {op.cobranzas.punitorioAcumulado > 0 && (
                <p className="text-xs text-red-300 mt-1">Punitorio: {fmt(op.cobranzas.punitorioAcumulado)}</p>
              )}
              {op.cobranzas.totalRecargo > 0 && (
                <p className="text-xs text-red-300">Total recargo: {fmt(op.cobranzas.totalRecargo)}</p>
              )}
            </div>
          )}

          {/* Datos del cliente */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Cliente</p>
            <div className="space-y-2 text-sm">
              {[
                { l: "Teléfono", v: op.cliente?.telefono },
                { l: "Email",    v: op.cliente?.email },
                { l: "Domicilio",v: op.cliente?.domicilio },
                { l: "CBU",      v: op.cliente?.cbu },
                { l: "Banco",    v: op.cliente?.banco },
                { l: "Sucursal", v: op.sucursalId || "—" },
              ].filter(r => r.v).map((r, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-gray-500 shrink-0">{r.l}</span>
                  <span className="text-white text-right text-xs font-medium truncate">{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Certificados */}
          <CertificadosWidget
            operacionId={id}
            estadoOp={op.estado}
          />
        </div>
      </div>
    </div>
  );
}
