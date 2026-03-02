"use client";
import { useEffect, useState } from "react";
import {
  doc, getDoc, collection, query, where,
  getDocs, addDoc, updateDoc, serverTimestamp, orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Clock, AlertTriangle,
  Loader2, CreditCard, Plus, FileText, Eye, User
} from "lucide-react";

interface Pago {
  id: string;
  monto: number;
  fecha: any;
  tipo: string;
  observacion?: string;
  registradoPor?: string;
}

export default function DetalleOperacionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { userData, entidadData } = useAuth();
  const router = useRouter();

  const [op, setOp] = useState<any>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal pago
  const [modalPago, setModalPago] = useState(false);
  const [montoPago, setMontoPago] = useState("");
  const [tipoPago, setTipoPago] = useState("CUOTA");
  const [obsPago, setObsPago] = useState("");
  const [guardandoPago, setGuardandoPago] = useState(false);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  // ── Cargar datos ──
  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const opSnap = await getDoc(doc(db, "operaciones", id));
        if (!opSnap.exists()) { router.push("/dashboard/cartera"); return; }
        const opData = { id: opSnap.id, ...opSnap.data() };
        setOp(opData);

        // Pagos
        const pagosSnap = await getDocs(
          query(collection(db, "pagos"), where("operacionId", "==", id), orderBy("fecha", "desc"))
        );
        setPagos(pagosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Pago)));

        // Onboarding
        const obSnap = await getDocs(
          query(collection(db, "onboarding_tokens"), where("legajoId", "==", id), where("estado", "==", "COMPLETADO"))
        );
        if (!obSnap.empty) setOnboarding(obSnap.docs[0].data());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  // ── Registrar pago ──
  const registrarPago = async () => {
    if (!montoPago || parseFloat(montoPago) <= 0) { alert("Ingresá un monto válido."); return; }
    setGuardandoPago(true);
    try {
      await addDoc(collection(db, "pagos"), {
        operacionId: id,
        entidadId: entidadData?.id,
        monto: parseFloat(montoPago),
        tipo: tipoPago,
        observacion: obsPago,
        estado: "APROBADO",
        registradoPor: userData?.email || "",
        fecha: serverTimestamp(),
      });

      const totalPagado = pagos.reduce((acc, p) => acc + p.monto, 0) + parseFloat(montoPago);
      const totalDeuda = (op?.financiero?.valorCuota || 0) * (op?.financiero?.cuotas || 1);

      // Si pagó todo, marcar como finalizado
      if (totalPagado >= totalDeuda) {
        await updateDoc(doc(db, "operaciones", id), {
          estado: "FINALIZADO",
          fechaFinalizacion: serverTimestamp(),
        });
      } else if (op?.estado === "EN_MORA") {
        // Si pagó algo estando en mora, sacar de mora
        await updateDoc(doc(db, "operaciones", id), {
          estado: "LIQUIDADO",
          "cobranzas.diasMora": 0,
        });
      }

      setMontoPago(""); setTipoPago("CUOTA"); setObsPago("");
      setModalPago(false);

      // Recargar
      const pagosSnap = await getDocs(
        query(collection(db, "pagos"), where("operacionId", "==", id), orderBy("fecha", "desc"))
      );
      setPagos(pagosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Pago)));
      const opSnap = await getDoc(doc(db, "operaciones", id));
      if (opSnap.exists()) setOp({ id: opSnap.id, ...opSnap.data() });
    } catch (e) {
      alert("Error al registrar el pago.");
    } finally {
      setGuardandoPago(false);
    }
  };

  // ── Cálculos ──
  const totalDeuda = (op?.financiero?.valorCuota || 0) * (op?.financiero?.cuotas || 1);
  const totalPagado = pagos.filter(p => p.tipo !== "DEVOLUCION").reduce((acc, p) => acc + p.monto, 0);
  const saldoPendiente = Math.max(0, totalDeuda - totalPagado);
  const porcentajePagado = totalDeuda > 0 ? Math.min(100, Math.round((totalPagado / totalDeuda) * 100)) : 0;
  const cuotasPagadas = op?.financiero?.valorCuota > 0
    ? Math.floor(totalPagado / op.financiero.valorCuota) : 0;

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#FF5E14]" size={36} />
    </div>
  );

  if (!op) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/dashboard/cartera")}
          className="p-2 bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">{op.cliente?.nombre || "Sin nombre"}</h1>
          <p className="text-gray-500 text-sm">DNI: {op.cliente?.dni} · ID: {id.slice(0, 12)}...</p>
        </div>
        <div className="ml-auto">
          <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
            op.estado === "EN_MORA" ? "bg-red-900/30 text-red-400 border-red-800/50" :
            op.estado === "LIQUIDADO" ? "bg-green-900/30 text-green-400 border-green-800/50" :
            op.estado === "FINALIZADO" ? "bg-gray-700/50 text-gray-400 border-gray-600/50" :
            "bg-blue-900/30 text-blue-400 border-blue-800/50"
          }`}>{op.estado}</span>
        </div>
      </div>

      {/* ALERTA MORA */}
      {op.estado === "EN_MORA" && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-400" size={20} />
          <div>
            <p className="text-red-400 font-bold text-sm">Operación en mora</p>
            <p className="text-red-300/70 text-xs">{op.cobranzas?.diasMora || "?"} días de atraso</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* DATOS FINANCIEROS */}
        <div className="md:col-span-2 bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 space-y-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Crédito</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Monto otorgado", valor: `$${(op.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}` },
              { label: "Cuotas", valor: op.financiero?.cuotas || "—" },
              { label: "Valor de cuota", valor: `$${(op.financiero?.valorCuota || 0).toLocaleString("es-AR")}` },
              { label: "TNA", valor: `${op.financiero?.tna || "—"}%` },
              { label: "CBU", valor: onboarding?.cbu || op.cliente?.cbu || "—" },
              { label: "Fecha liquidación", valor: op.fechaLiquidacion?.toDate?.()?.toLocaleDateString("es-AR") || "—" },
            ].map(({ label, valor }) => (
              <div key={label}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-bold text-white text-sm mt-0.5">{valor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SALDO */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Saldo</p>
          <div>
            <p className="text-3xl font-black text-white">${saldoPendiente.toLocaleString("es-AR")}</p>
            <p className="text-xs text-gray-500 mt-1">pendiente de pago</p>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Pagado {porcentajePagado}%</span>
              <span>{cuotasPagadas}/{op.financiero?.cuotas} cuotas</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${porcentajePagado}%`, backgroundColor: colorPrimario }} />
            </div>
          </div>
          <button onClick={() => setModalPago(true)}
            className="mt-4 w-full text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
            style={{ backgroundColor: colorPrimario }}>
            <Plus size={16} /> Registrar Pago
          </button>
        </div>
      </div>

      {/* DOCUMENTOS */}
      {(onboarding || op.documentos?.cad_url) && (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Documentos</p>
          <div className="flex flex-wrap gap-3">
            {op.documentos?.cad_url && (
              <a href={op.documentos.cad_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 px-4 py-2.5 rounded-xl text-sm text-white transition-colors">
                <FileText size={16} className="text-[#FF5E14]" /> Ver CAD
              </a>
            )}
            {onboarding?.archivos && Object.entries(onboarding.archivos)
              .filter(([_, url]) => url)
              .map(([tipo, url]) => (
                <a key={tipo} href={url as string} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 px-4 py-2.5 rounded-xl text-sm text-white transition-colors">
                  <Eye size={16} className="text-blue-400" />
                  {tipo === "dniFrente" ? "DNI Frente" : tipo === "dniDorso" ? "DNI Dorso" : tipo === "selfie" ? "Selfie" : "Firma"}
                </a>
              ))}
          </div>
        </div>
      )}

      {/* HISTORIAL DE PAGOS */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Historial de Pagos</p>
          <p className="text-xs text-gray-500">{pagos.length} registros</p>
        </div>

        {pagos.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Sin pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {pagos.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-green-400" />
                  <div>
                    <p className="text-sm font-bold text-white">${p.monto.toLocaleString("es-AR")}</p>
                    <p className="text-xs text-gray-500">{p.tipo} · {p.observacion || ""}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {p.fecha?.toDate?.()?.toLocaleDateString("es-AR") || "—"}
                  </p>
                  <p className="text-[10px] text-gray-600">{p.registradoPor}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PAGO */}
      {modalPago && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black mb-5">Registrar Pago</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Monto ($)</label>
                <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)}
                  placeholder={`Cuota: $${(op.financiero?.valorCuota || 0).toLocaleString("es-AR")}`}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Tipo</label>
                <select value={tipoPago} onChange={e => setTipoPago(e.target.value)}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none">
                  <option value="CUOTA">Cuota</option>
                  <option value="CANCELACION_TOTAL">Cancelación Total</option>
                  <option value="PAGO_PARCIAL">Pago Parcial</option>
                  <option value="MORA">Intereses de Mora</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Observación (opcional)</label>
                <input type="text" value={obsPago} onChange={e => setObsPago(e.target.value)}
                  placeholder="Ej: Transferencia banco Galicia"
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalPago(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={registrarPago} disabled={guardandoPago}
                className="flex-1 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                style={{ backgroundColor: colorPrimario }}>
                {guardandoPago ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
