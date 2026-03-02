"use client";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Save, Loader2, CheckCircle2, MessageSquare,
  Eye, EyeOff, Send, ShieldCheck, AlertTriangle
} from "lucide-react";

const EVENTOS = [
  { key: "LINK_ONBOARDING",         label: "Link de onboarding al cliente",      desc: "Se envía automáticamente al generar el link" },
  { key: "CREDITO_APROBADO",        label: "Crédito aprobado",                   desc: "Cuando el aprobador aprueba la operación" },
  { key: "CREDITO_LIQUIDADO",       label: "Crédito liquidado (fondos enviados)", desc: "Cuando el liquidador confirma la transferencia" },
  { key: "RECORDATORIO_VENCIMIENTO",label: "Recordatorio 48hs antes del vencimiento", desc: "Disparado por el cron nocturno" },
  { key: "AVISO_MORA",              label: "Aviso de mora (día 1)",               desc: "Cuando la operación pasa a EN_MORA" },
  { key: "PROMESA_CONFIRMADA",      label: "Promesa de pago confirmada",          desc: "Cuando el gestor registra una promesa" },
];

export default function ConfigWhatsAppPage() {
  const { entidadData, userData } = useAuth();
  const [config, setConfig] = useState({
    activo: false,
    phoneNumberId: "",
    accessToken: "",
    telefonoNegocio: "",
    nombreEntidad: "",
    eventos: {
      LINK_ONBOARDING: true,
      CREDITO_APROBADO: true,
      CREDITO_LIQUIDADO: true,
      RECORDATORIO_VENCIMIENTO: false,
      AVISO_MORA: true,
      PROMESA_CONFIRMADA: false,
    } as Record<string, boolean>,
  });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mostrarToken, setMostrarToken] = useState(false);
  const [testeando, setTesteando] = useState(false);
  const [resultadoTest, setResultadoTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [telefonoTest, setTelefonoTest] = useState("");

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  // ── Cargar config ──
  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      try {
        const snap = await getDoc(doc(db, "entidades", entidadData.id));
        const ws = snap.data()?.configuracion?.whatsapp;
        if (ws) setConfig(prev => ({ ...prev, ...ws }));
        setConfig(prev => ({ ...prev, nombreEntidad: prev.nombreEntidad || entidadData.nombreFantasia || "" }));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    cargar();
  }, [entidadData]);

  // ── Guardar ──
  const guardar = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.whatsapp": config,
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch { alert("Error al guardar."); }
    finally { setGuardando(false); }
  };

  // ── Test de envío ──
  const testEnvio = async () => {
    if (!telefonoTest) { alert("Ingresá un número para el test."); return; }
    setTesteando(true);
    setResultadoTest(null);
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entidadId: entidadData?.id,
          telefono: telefonoTest.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      setResultadoTest({ ok: data.success, msg: data.success ? `✅ Enviado. ID: ${data.messageId}` : `❌ ${data.error}` });
    } catch (e: any) {
      setResultadoTest({ ok: false, msg: `❌ ${e.message}` });
    } finally { setTesteando(false); }
  };

  const inputClass = "w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gray-500";
  const labelClass = "block text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-bold";

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-500" size={28} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">

      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">WhatsApp</h1>
          <p className="text-gray-500 text-sm mt-1">Meta Cloud API · configuración por entidad</p>
        </div>
        <button onClick={guardar} disabled={guardando}
          className="flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm"
          style={{ backgroundColor: colorPrimario }}>
          {guardando ? <Loader2 size={15} className="animate-spin" /> :
           guardado  ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {guardado ? "¡Guardado!" : "Guardar"}
        </button>
      </div>

      {/* TOGGLE ACTIVAR */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${config.activo ? "bg-green-900/30" : "bg-gray-800"}`}>
            <MessageSquare size={20} className={config.activo ? "text-green-400" : "text-gray-500"} />
          </div>
          <div>
            <p className="font-bold text-white text-sm">WhatsApp Business</p>
            <p className="text-xs text-gray-500">{config.activo ? "Activo — mensajes se envían automáticamente" : "Inactivo — no se envían mensajes"}</p>
          </div>
        </div>
        <button onClick={() => setConfig(p => ({ ...p, activo: !p.activo }))}
          className={`relative w-12 h-6 rounded-full transition-colors ${config.activo ? "bg-green-500" : "bg-gray-700"}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${config.activo ? "left-6" : "left-0.5"}`} />
        </button>
      </div>

      {/* CREDENCIALES META */}
      <div className={`bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 space-y-4 transition-opacity ${!config.activo ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={16} style={{ color: colorPrimario }} />
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Credenciales Meta</p>
        </div>

        <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4 text-xs text-blue-300 space-y-1">
          <p className="font-bold">¿Dónde obtener estos datos?</p>
          <p>1. Ingresá a <span className="font-mono">developers.facebook.com</span> → Tu App → WhatsApp → API Setup</p>
          <p>2. <strong>Phone Number ID</strong>: aparece en la sección "From"</p>
          <p>3. <strong>Access Token</strong>: generá un token permanente en System Users</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nombre de la entidad (aparece en mensajes)</label>
            <input value={config.nombreEntidad}
              onChange={e => setConfig(p => ({ ...p, nombreEntidad: e.target.value }))}
              placeholder="Ej: Cooperativa San Martín"
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone Number ID</label>
            <input value={config.phoneNumberId}
              onChange={e => setConfig(p => ({ ...p, phoneNumberId: e.target.value }))}
              placeholder="Ej: 123456789012345"
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Número de negocio (con código de país)</label>
            <input value={config.telefonoNegocio}
              onChange={e => setConfig(p => ({ ...p, telefonoNegocio: e.target.value }))}
              placeholder="Ej: 549261XXXXXXX"
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Access Token permanente</label>
            <div className="relative">
              <input
                type={mostrarToken ? "text" : "password"}
                value={config.accessToken}
                onChange={e => setConfig(p => ({ ...p, accessToken: e.target.value }))}
                placeholder="EAAxxxxxxxx..."
                className={`${inputClass} pr-10`} />
              <button onClick={() => setMostrarToken(!mostrarToken)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-white transition-colors">
                {mostrarToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EVENTOS */}
      <div className={`bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 transition-opacity ${!config.activo ? "opacity-40 pointer-events-none" : ""}`}>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Eventos activos</p>
        <div className="space-y-3">
          {EVENTOS.map(ev => (
            <div key={ev.key} onClick={() => setConfig(p => ({ ...p, eventos: { ...p.eventos, [ev.key]: !p.eventos[ev.key] } }))}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                config.eventos[ev.key]
                  ? "border-opacity-40 bg-opacity-10"
                  : "border-gray-800 hover:bg-white/[0.02]"
              }`}
              style={config.eventos[ev.key] ? { borderColor: `${colorPrimario}55`, backgroundColor: `${colorPrimario}11` } : {}}>
              <div>
                <p className="text-sm font-bold text-white">{ev.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ev.desc}</p>
              </div>
              <div className={`w-10 h-5 rounded-full transition-colors shrink-0 ml-4 ${config.eventos[ev.key] ? "bg-green-500" : "bg-gray-700"}`}>
                <span className={`block w-4 h-4 mt-0.5 bg-white rounded-full shadow transition-all ${config.eventos[ev.key] ? "ml-5" : "ml-0.5"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TEST DE ENVÍO */}
      <div className={`bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 transition-opacity ${!config.activo ? "opacity-40 pointer-events-none" : ""}`}>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Enviar mensaje de prueba</p>
        <div className="flex gap-3">
          <input value={telefonoTest}
            onChange={e => setTelefonoTest(e.target.value)}
            placeholder="Número destino (ej: 549261XXXXXXX)"
            className={`${inputClass} flex-1`} />
          <button onClick={testEnvio} disabled={testeando || !config.phoneNumberId || !config.accessToken}
            className="flex items-center gap-2 px-4 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-colors"
            style={{ backgroundColor: colorPrimario }}>
            {testeando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Test
          </button>
        </div>
        {resultadoTest && (
          <p className={`text-xs mt-3 font-bold ${resultadoTest.ok ? "text-green-400" : "text-red-400"}`}>
            {resultadoTest.msg}
          </p>
        )}
        <p className="text-xs text-gray-600 mt-2">El número destino debe haber iniciado conversación con tu número de negocio en las últimas 24hs (ventana de Meta).</p>
      </div>

    </div>
  );
}
