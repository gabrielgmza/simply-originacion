"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  UploadCloud, CheckCircle2, FileText, Calculator,
  CreditCard, Loader2, LandmarkIcon, Send, Copy, RefreshCw,
  Smartphone, ExternalLink
} from "lucide-react";

interface Props {
  dniBuscado: string;
  nombreCliente?: string;
}

export default function FormularioAprobacion({ dniBuscado, nombreCliente = "" }: Props) {
  const { userData, entidadData } = useAuth();

  const [monto, setMonto] = useState("");
  const [cuotas, setCuotas] = useState("3");
  const [generandoPdf, setGenerandoPdf] = useState(false);

  // Onboarding
  const [linkGenerado, setLinkGenerado] = useState("");
  const [legajoId, setLegajoId] = useState("");
  const [generandoLink, setGenerandoLink] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [onboardingCompleto, setOnboardingCompleto] = useState(false);

  const cuotaEstimada = monto ? Math.round((parseInt(monto) * 1.5) / parseInt(cuotas)) : 0;

  // ── Generar link de onboarding ──────────────────────────────────────────────
  const generarLinkOnboarding = async () => {
    if (!monto) { alert("Primero ingresá el monto del crédito."); return; }
    setGenerandoLink(true);
    try {
      // Crear la operación en Firestore primero para obtener el legajoId
      const res = await fetch("/api/onboarding/crear-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legajoId: legajoId || `LEG-${dniBuscado}-${Date.now()}`,
          dni: dniBuscado,
          nombreCliente,
          entidadId: entidadData?.id || "default",
          vendedorId: userData?.uid || "",
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setLinkGenerado(data.link);
      setLegajoId(legajoId || `LEG-${dniBuscado}-${Date.now()}`);
    } catch (e: any) {
      alert("Error al generar el link: " + e.message);
    } finally {
      setGenerandoLink(false);
    }
  };

  // ── Copiar link ─────────────────────────────────────────────────────────────
  const copiarLink = async () => {
    await navigator.clipboard.writeText(linkGenerado);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  };

  // ── Enviar por WhatsApp ─────────────────────────────────────────────────────
  const enviarWhatsApp = () => {
    const texto = encodeURIComponent(
      `Hola${nombreCliente ? ` ${nombreCliente.split(" ")[0]}` : ""}! Te enviamos el link para completar tu documentación del crédito. Solo te llevará 5 minutos:\n\n${linkGenerado}`
    );
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  };

  // ── Generar CAD con firma ───────────────────────────────────────────────────
  const generarCAD = async () => {
    if (!monto) { alert("Ingresá el monto del crédito."); return; }
    setGenerandoPdf(true);
    try {
      const res = await fetch("/api/documentos/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legajoId: legajoId || `LEG-${dniBuscado}`,
          dni: dniBuscado,
          nombreCliente,
          monto: parseInt(monto),
          cuotas: parseInt(cuotas),
          cuotaEstimada,
          tna: entidadData?.configuracion?.tasaInteresBase || 0,
          entidadNombre: entidadData?.nombreFantasia || "Entidad",
          entidadId: entidadData?.id || "default",
        }),
      });

      if (!res.ok) throw new Error("Error generando CAD");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CAD_Simply_${dniBuscado}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Hubo un problema al generar el CAD.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

      {/* DNI auditado */}
      <div className="bg-green-950/20 border border-green-900/50 p-4 rounded-xl flex items-center gap-3">
        <LandmarkIcon className="text-green-500" size={20} />
        <p className="text-sm font-bold text-gray-300">
          Auditoría completada para el DNI:{" "}
          <span className="text-white font-black text-base font-mono ml-1">{dniBuscado}</span>
          {nombreCliente && <span className="text-gray-400 ml-2">— {nombreCliente}</span>}
        </p>
      </div>

      {/* ── SECCIÓN 1: ESTRUCTURA DEL CRÉDITO ── */}
      <div>
        <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
          <div className="bg-green-600/20 p-2 rounded-xl text-green-500"><Calculator size={24} /></div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wide">Estructura del Crédito</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Monto y cuotas */}
          <div className="space-y-6">
            <div>
              <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Monto a Otorgar ($)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number" value={monto} onChange={(e) => setMonto(e.target.value)}
                  placeholder="Ej: 150000"
                  className="w-full bg-black border border-gray-800 p-4 pl-8 rounded-2xl text-white outline-none focus:border-green-500 font-mono text-lg transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Plan de Cuotas</label>
              <select value={cuotas} onChange={(e) => setCuotas(e.target.value)}
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-green-500 font-bold transition-colors">
                <option value="1">1 Cuota</option>
                <option value="3">3 Cuotas</option>
                <option value="6">6 Cuotas</option>
                <option value="12">12 Cuotas</option>
                <option value="18">18 Cuotas</option>
                <option value="24">24 Cuotas</option>
              </select>
            </div>

            <div className="bg-[#111] p-4 rounded-xl border border-gray-800 flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Cuota Estimada mensual</p>
                <p className="text-white font-mono text-xl">${cuotaEstimada.toLocaleString("es-AR")}</p>
              </div>
              <CreditCard className="text-gray-600" size={28} />
            </div>
          </div>

          {/* Info entidad */}
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 space-y-3 h-fit">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Parámetros de la Entidad</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">TNA</span>
              <span className="text-white font-bold">{entidadData?.configuracion?.tasaInteresBase || "—"}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Seguro de Vida</span>
              <span className="text-white font-bold">{entidadData?.configuracion?.seguroVidaPorc || "—"}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Gastos Otorg.</span>
              <span className="text-white font-bold">{entidadData?.configuracion?.gastosOtorgamientoPorc || "—"}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 2: ONBOARDING DIGITAL ── */}
      <div>
        <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
          <div className="bg-blue-600/20 p-2 rounded-xl text-blue-400"><Smartphone size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">Onboarding Digital</h2>
            <p className="text-gray-500 text-xs mt-0.5">El cliente completa DNI, selfie, firma y CBU desde su celular</p>
          </div>
        </div>

        {!linkGenerado ? (
          <button
            onClick={generarLinkOnboarding}
            disabled={generandoLink || !monto}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all flex justify-center items-center gap-2"
          >
            {generandoLink ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            {generandoLink ? "Generando link..." : "Generar Link de Onboarding"}
          </button>
        ) : (
          <div className="space-y-4">
            {/* Status */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${onboardingCompleto ? "bg-green-900/20 border-green-800" : "bg-blue-900/20 border-blue-800"}`}>
              {onboardingCompleto
                ? <CheckCircle2 size={18} className="text-green-400" />
                : <Loader2 size={18} className="text-blue-400 animate-spin" />}
              <p className="text-sm font-bold text-gray-300">
                {onboardingCompleto ? "¡El cliente completó el onboarding!" : "Esperando que el cliente complete el formulario..."}
              </p>
            </div>

            {/* Link */}
            <div className="bg-[#111] border border-gray-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Link generado (expira en 72hs)</p>
              <p className="text-xs text-gray-300 font-mono break-all">{linkGenerado}</p>
            </div>

            {/* Acciones del link */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={copiarLink}
                className="flex flex-col items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-3 px-4 rounded-xl text-xs font-bold transition-colors">
                {linkCopiado ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} />}
                {linkCopiado ? "Copiado!" : "Copiar"}
              </button>

              <button onClick={enviarWhatsApp}
                className="flex flex-col items-center gap-2 bg-green-700 hover:bg-green-600 text-white py-3 px-4 rounded-xl text-xs font-bold transition-colors">
                <Send size={18} />
                WhatsApp
              </button>

              <button onClick={generarLinkOnboarding}
                className="flex flex-col items-center gap-2 bg-gray-900 hover:bg-gray-800 text-gray-400 py-3 px-4 rounded-xl text-xs font-bold transition-colors">
                <RefreshCw size={18} />
                Nuevo link
              </button>
            </div>

            {/* Abrir en nueva pestaña */}
            <a href={linkGenerado} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              <ExternalLink size={14} /> Ver formulario del cliente
            </a>
          </div>
        )}
      </div>

      {/* ── SECCIÓN 3: GENERAR CAD ── */}
      <div className="pt-4 border-t border-gray-800">
        <button
          onClick={generarCAD}
          disabled={!monto || generandoPdf}
          className="w-full bg-[#FF5E14] hover:bg-[#E04D0B] disabled:bg-gray-800 disabled:text-gray-500 text-white font-black uppercase tracking-widest py-5 rounded-2xl transition-all flex justify-center items-center gap-2 text-lg"
        >
          {generandoPdf ? <Loader2 className="animate-spin" size={24} /> : <FileText size={24} />}
          {generandoPdf ? "Generando CAD..." : "Generar CAD con Firma Digital"}
        </button>
        {!linkGenerado && (
          <p className="text-center text-xs text-gray-600 mt-2">
            Podés generar el CAD ahora o esperar a que el cliente complete el onboarding para incluir su firma.
          </p>
        )}
      </div>

    </div>
  );
}
