"use client";
import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, getDocs,
  doc, updateDoc, serverTimestamp, getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  CheckCircle2, Loader2, Upload, Eye,
  Banknote, AlertCircle, X, FileText,
  CreditCard, Clock, ChevronRight
} from "lucide-react";

interface Operacion {
  id: string;
  estado: string;
  estadoAprobacion?: string;
  cliente?: { nombre?: string; dni?: string; telefono?: string };
  financiero?: { montoSolicitado?: number; cuotas?: number; valorCuota?: number };
  onboarding?: { cbu?: string; completado?: boolean };
  documentos?: { cad_url?: string };
  desembolso?: { comprobanteUrl?: string; fechaTransferencia?: any; liquidadoPor?: string };
  fechaCreacion?: any;
}

export default function LiquidacionPage() {
  const { entidadData, userData } = useAuth();
  const [ops, setOps] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [opSeleccionada, setOpSeleccionada] = useState<Operacion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [subiendoComp, setSubiendoComp] = useState(false);
  const [comprobante, setComprobante] = useState<string>("");
  const [confirmado, setConfirmado] = useState(false);
  const compInputRef = useRef<HTMLInputElement>(null);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  // ── Cargar operaciones aprobadas pendientes de liquidar ──
  const cargar = async () => {
    if (!entidadData?.id) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "operaciones"),
          where("entidadId", "==", entidadData.id),
          where("estadoAprobacion", "==", "APROBADO")
        )
      );
      const todas = snap.docs.map(d => ({ id: d.id, ...d.data() } as Operacion));
      // Solo las que NO están liquidadas
      setOps(todas.filter(o => o.estado !== "LIQUIDADO" && o.estado !== "FINALIZADO"));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [entidadData]);

  // ── Abrir panel de una operación ──
  const abrirOp = async (op: Operacion) => {
    // Buscar CBU desde onboarding si no está en la op
    if (!op.onboarding?.cbu) {
      const obSnap = await getDocs(
        query(collection(db, "onboarding_tokens"),
          where("legajoId", "==", op.id),
          where("estado", "==", "COMPLETADO"))
      );
      if (!obSnap.empty) {
        const obData = obSnap.docs[0].data();
        op = { ...op, onboarding: { ...op.onboarding, cbu: obData.cbu, completado: true } };
      }
    }
    setOpSeleccionada(op);
    setComprobante("");
    setConfirmado(false);
  };

  // ── Subir comprobante ──
  const subirComprobante = async (file: File) => {
    if (!opSeleccionada) return;
    setSubiendoComp(true);
    try {
      const storageRef = ref(storage,
        `comprobantes/${entidadData?.id}/${opSeleccionada.id}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setComprobante(url);
    } catch { alert("Error al subir el comprobante."); }
    finally { setSubiendoComp(false); }
  };

  // ── Confirmar liquidación ──
  const confirmarLiquidacion = async () => {
    if (!opSeleccionada || !confirmado) return;
    setProcesando(true);
    try {
      await updateDoc(doc(db, "operaciones", opSeleccionada.id), {
        estado: "LIQUIDADO",
        estadoAprobacion: "APROBADO",
        fechaLiquidacion: serverTimestamp(),
        "desembolso.comprobanteUrl": comprobante || null,
        "desembolso.fechaTransferencia": serverTimestamp(),
        "desembolso.liquidadoPor": userData?.email || "",
      });

      // Notificación WhatsApp si tiene teléfono
      if (opSeleccionada.cliente?.telefono) {
        await fetch("/api/operaciones/liquidar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operacionId: opSeleccionada.id }),
        });
      }

      setOpSeleccionada(null);
      cargar();
    } catch { alert("Error al confirmar la liquidación."); }
    finally { setProcesando(false); }
  };

  const cbu = opSeleccionada?.onboarding?.cbu || "—";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ENCABEZADO */}
      <div>
        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Liquidación</h1>
        <p className="text-gray-500 text-sm mt-1">
          {ops.length} operación{ops.length !== 1 ? "es" : ""} aprobada{ops.length !== 1 ? "s" : ""} pendiente{ops.length !== 1 ? "s" : ""} de desembolso
        </p>
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-500" size={32} />
        </div>
      ) : ops.length === 0 ? (
        <div className="text-center py-20 bg-[#0A0A0A] border border-gray-800 rounded-2xl text-gray-600">
          <CheckCircle2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay operaciones pendientes de liquidar.</p>
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-gray-900">
              <tr>
                {["Cliente", "Monto", "CBU", "CAD", ""].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {ops.map(op => (
                <tr key={op.id} className="hover:bg-white/[0.02] cursor-pointer group transition-all"
                  onClick={() => abrirOp(op)}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-white group-hover:text-blue-400 transition-colors">
                      {op.cliente?.nombre || "Sin nombre"}
                    </p>
                    <p className="text-xs text-gray-600 font-mono">{op.cliente?.dni}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-white">${(op.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}</p>
                    <p className="text-xs text-gray-600">{op.financiero?.cuotas} cuotas</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-mono text-xs text-gray-400">
                      {op.onboarding?.cbu ? `****${op.onboarding.cbu.slice(-4)}` : <span className="text-yellow-500">Pendiente</span>}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {op.documentos?.cad_url
                      ? <span className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Generado</span>
                      : <span className="text-gray-600 text-xs">—</span>
                    }
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

      {/* ── PANEL LATERAL DE LIQUIDACIÓN ── */}
      {opSeleccionada && (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-end">
          <div className="bg-[#0A0A0A] border-l border-gray-800 w-full max-w-lg flex flex-col h-full overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-[#0A0A0A] z-10">
              <div>
                <h2 className="text-lg font-black text-white">Confirmar Liquidación</h2>
                <p className="text-xs text-gray-500">{opSeleccionada.cliente?.nombre}</p>
              </div>
              <button onClick={() => setOpSeleccionada(null)}>
                <X size={22} className="text-gray-500 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">

              {/* Datos del desembolso */}
              <div className="bg-gray-900/50 rounded-2xl p-5 space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Datos del Desembolso</p>

                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Monto a transferir</span>
                  <span className="font-black text-white text-lg">
                    ${(opSeleccionada.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">CBU destino</span>
                  <div className="text-right">
                    {cbu !== "—"
                      ? <span className="font-mono text-white text-sm">{cbu}</span>
                      : <span className="text-yellow-400 text-xs font-bold">⚠ Sin CBU — el cliente no completó el onboarding</span>
                    }
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Plan</span>
                  <span className="text-white text-sm font-bold">
                    {opSeleccionada.financiero?.cuotas} cuotas de ${(opSeleccionada.financiero?.valorCuota || 0).toLocaleString("es-AR")}
                  </span>
                </div>

                {opSeleccionada.documentos?.cad_url && (
                  <a href={opSeleccionada.documentos.cad_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-bold hover:underline pt-2 border-t border-gray-800"
                    style={{ color: colorPrimario }}>
                    <FileText size={14} /> Ver CAD firmado →
                  </a>
                )}
              </div>

              {/* Comprobante */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
                  Comprobante de transferencia <span className="text-gray-600 normal-case tracking-normal">(opcional)</span>
                </p>

                <input ref={compInputRef} type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) subirComprobante(f); }} />

                {comprobante ? (
                  <div className="flex items-center gap-3 bg-green-900/20 border border-green-800/50 p-4 rounded-xl">
                    <CheckCircle2 size={18} className="text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-400">Comprobante subido</p>
                    </div>
                    <a href={comprobante} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-white">
                      <Eye size={16} />
                    </a>
                    <button onClick={() => setComprobante("")} className="text-gray-600 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => compInputRef.current?.click()}
                    disabled={subiendoComp}
                    className="w-full border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl p-5 flex flex-col items-center gap-2 transition-colors">
                    {subiendoComp
                      ? <Loader2 size={22} className="animate-spin text-gray-500" />
                      : <Upload size={22} className="text-gray-500" />}
                    <p className="text-sm text-gray-500">
                      {subiendoComp ? "Subiendo..." : "Subir comprobante (imagen o PDF)"}
                    </p>
                  </button>
                )}
              </div>

              {/* Checkbox confirmación */}
              <div
                onClick={() => setConfirmado(!confirmado)}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  confirmado
                    ? "border-green-800/50 bg-green-900/20"
                    : "border-gray-700 bg-gray-900/30 hover:border-gray-600"
                }`}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  confirmado ? "border-green-500 bg-green-500" : "border-gray-600"
                }`}>
                  {confirmado && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <p className="text-sm text-gray-300">
                  Confirmo que realicé la transferencia bancaria de{" "}
                  <span className="font-bold text-white">
                    ${(opSeleccionada.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}
                  </span>{" "}
                  al CBU del cliente y que los fondos fueron enviados correctamente.
                </p>
              </div>

            </div>

            {/* Botón confirmar */}
            <div className="p-6 border-t border-gray-800 sticky bottom-0 bg-[#0A0A0A]">
              <button
                onClick={confirmarLiquidacion}
                disabled={!confirmado || procesando}
                className="w-full py-4 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ backgroundColor: confirmado ? colorPrimario : "#374151" }}>
                {procesando
                  ? <><Loader2 size={18} className="animate-spin" /> Procesando...</>
                  : <><CreditCard size={18} /> Confirmar Liquidación</>
                }
              </button>
              <p className="text-xs text-gray-600 text-center mt-2">
                Esta acción cambia el estado a LIQUIDADO y notifica al cliente.
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
