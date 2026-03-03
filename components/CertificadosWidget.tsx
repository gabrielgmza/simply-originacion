"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { FileText, Download, Loader2, CheckCircle2, ShieldCheck, Clock, XCircle } from "lucide-react";

type TipoCert = "LIBRE_DEUDA" | "ESTADO_VIGENTE" | "CUOTAS_AL_DIA";

interface Props {
  operacionId: string;
  estadoOp: string; // LIQUIDADO | FINALIZADO | EN_MORA | etc.
}

const CERTS: { tipo: TipoCert; label: string; desc: string; icon: React.ReactNode; estados: string[] }[] = [
  {
    tipo: "LIBRE_DEUDA",
    label: "Libre Deuda",
    desc: "Certifica cancelación total del crédito",
    icon: <ShieldCheck size={16} />,
    estados: ["FINALIZADO"],
  },
  {
    tipo: "ESTADO_VIGENTE",
    label: "Estado de Crédito",
    desc: "Informa saldo y condiciones actuales",
    icon: <FileText size={16} />,
    estados: ["LIQUIDADO", "EN_MORA", "REINTENTO_PROGRAMADO", "APROBADO"],
  },
  {
    tipo: "CUOTAS_AL_DIA",
    label: "Cuotas al Día",
    desc: "Constancia de cumplimiento de pagos",
    icon: <Clock size={16} />,
    estados: ["LIQUIDADO", "FINALIZADO", "APROBADO"],
  },
];

export default function CertificadosWidget({ operacionId, estadoOp }: Props) {
  const { userData, entidadData } = useAuth();
  const [descargando, setDescargando] = useState<TipoCert | null>(null);
  const [emitido, setEmitido]         = useState<TipoCert | null>(null);
  // Campos del emisor con modal simple
  const [modalTipo, setModalTipo]     = useState<TipoCert | null>(null);
  const [emisorNombre, setEmisorNombre] = useState(userData?.nombre || "");
  const [emisorCargo,  setEmisorCargo]  = useState("Responsable de Créditos");

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const descargar = async (tipo: TipoCert) => {
    setDescargando(tipo);
    setModalTipo(null);
    try {
      const res = await fetch("/api/certificados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId,
          entidadId:    entidadData?.id,
          tipo,
          emisorNombre,
          emisorCargo,
          usuarioEmail: userData?.email,
        }),
      });
      if (!res.ok) { alert("Error al generar el certificado."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${tipo.toLowerCase().replace(/_/g, "-")}-${operacionId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setEmitido(tipo);
      setTimeout(() => setEmitido(null), 3000);
    } catch (e) { console.error(e); alert("Error de conexión."); }
    finally { setDescargando(null); }
  };

  const disponibles = CERTS.filter(c => c.estados.includes(estadoOp));

  if (disponibles.length === 0) return null;

  return (
    <>
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Certificados y Constancias</p>
        <div className="space-y-2">
          {disponibles.map(c => (
            <div key={c.tipo}
              className="flex items-center justify-between bg-gray-900/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="text-gray-500">{c.icon}</div>
                <div>
                  <p className="text-sm font-bold text-white">{c.label}</p>
                  <p className="text-xs text-gray-500">{c.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setModalTipo(c.tipo)}
                disabled={descargando === c.tipo}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                style={{ backgroundColor: `${colorPrimario}22`, color: colorPrimario }}>
                {descargando === c.tipo
                  ? <Loader2 size={13} className="animate-spin" />
                  : emitido === c.tipo
                    ? <CheckCircle2 size={13} className="text-green-400" />
                    : <Download size={13} />}
                {emitido === c.tipo ? "Emitido" : "Emitir"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal firma/cargo del emisor */}
      {modalTipo && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <p className="font-black text-white mb-1">Datos del emisor</p>
            <p className="text-xs text-gray-500 mb-4">Aparecerán en la firma del certificado</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-1.5">Nombre del emisor</label>
                <input value={emisorNombre}
                  onChange={e => setEmisorNombre(e.target.value)}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-1.5">Cargo</label>
                <input value={emisorCargo}
                  onChange={e => setEmisorCargo(e.target.value)}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalTipo(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">
                Cancelar
              </button>
              <button onClick={() => descargar(modalTipo)}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: colorPrimario }}>
                <Download size={14} /> Generar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
