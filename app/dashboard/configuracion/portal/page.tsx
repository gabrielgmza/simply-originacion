"use client";
// app/dashboard/configuracion/portal/page.tsx
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Save, Loader2, CheckCircle2, ExternalLink,
  Copy, Eye, EyeOff, Globe, MessageSquare,
  FileText, CreditCard, History, ShieldCheck
} from "lucide-react";

export default function ConfigPortalPage() {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [config, setConfig] = useState({
    activo:                 false,
    mostrarPlanCuotas:      true,
    mostrarHistorialPagos:  true,
    mostrarCertificados:    true,
    mostrarContactoAsesor:  true,
    mensajeBienvenida:      "",
  });
  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ok,        setOk]        = useState(false);
  const [copiado,   setCopiado]   = useState(false);

  const puedeEditar = ["GERENTE_GENERAL","MASTER_PAYSUR"].includes(userData?.rol || "");

  const urlPortal = entidadData?.id
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${entidadData.id}`
    : "";

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      try {
        const snap = await getDoc(doc(db, "entidades", entidadData.id));
        const saved = snap.data()?.configuracion?.portal;
        if (saved) setConfig(prev => ({ ...prev, ...saved }));
      } finally { setCargando(false); }
    };
    cargar();
  }, [entidadData]);

  const guardar = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.portal": config,
      });
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch { alert("Error al guardar."); }
    finally { setGuardando(false); }
  };

  const copiarUrl = () => {
    navigator.clipboard.writeText(urlPortal);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const set = (key: string, value: any) => setConfig(prev => ({ ...prev, [key]: value }));

  const Toggle = ({ k, label, desc, icon }: { k: string; label: string; desc?: string; icon?: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        {icon && <div className="text-gray-500 mt-0.5 shrink-0">{icon}</div>}
        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          {desc && <p className="text-[10px] text-gray-600 mt-0.5">{desc}</p>}
        </div>
      </div>
      <button
        onClick={() => puedeEditar && set(k, !(config as any)[k])}
        disabled={!puedeEditar}
        className={`w-10 h-5 rounded-full transition-all relative shrink-0 mt-0.5 disabled:opacity-50`}
        style={{ backgroundColor: (config as any)[k] ? colorPrimario : "#374151" }}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${(config as any)[k] ? "left-5" : "left-0.5"}`}/>
      </button>
    </div>
  );

  if (cargando) return (
    <div className="flex justify-center py-32"><Loader2 className="animate-spin text-gray-600" size={24}/></div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Portal del Cliente</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Autogestión para que tus clientes consulten su crédito
          </p>
        </div>
        {puedeEditar && (
          <button onClick={guardar} disabled={guardando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ backgroundColor: colorPrimario }}>
            {guardando ? <Loader2 size={14} className="animate-spin"/> : ok ? <CheckCircle2 size={14}/> : <Save size={14}/>}
            {ok ? "Guardado" : "Guardar"}
          </button>
        )}
      </div>

      {/* Activar portal */}
      <div className={`border rounded-2xl p-5 transition-all ${config.activo ? "bg-green-900/10 border-green-900/40" : "bg-[#0A0A0A] border-gray-800"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.activo ? "bg-green-900/30" : "bg-gray-900"}`}>
              <Globe size={18} className={config.activo ? "text-green-400" : "text-gray-600"}/>
            </div>
            <div>
              <p className="font-black text-white">Portal activo</p>
              <p className="text-xs text-gray-500">
                {config.activo ? "Los clientes pueden acceder ahora" : "Portal desactivado — nadie puede acceder"}
              </p>
            </div>
          </div>
          <button
            onClick={() => puedeEditar && set("activo", !config.activo)}
            disabled={!puedeEditar}
            className="w-12 h-6 rounded-full transition-all relative disabled:opacity-50"
            style={{ backgroundColor: config.activo ? "#22c55e" : "#374151" }}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${config.activo ? "left-7" : "left-1"}`}/>
          </button>
        </div>
      </div>

      {/* URL del portal */}
      {config.activo && (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-3">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">URL del portal</p>
          <div className="flex items-center gap-2 bg-[#111] border border-gray-700 rounded-xl px-3 py-2.5">
            <Globe size={13} className="text-gray-500 shrink-0"/>
            <p className="text-sm text-gray-300 flex-1 truncate font-mono">{urlPortal}</p>
            <button onClick={copiarUrl} className="text-gray-500 hover:text-white transition-colors shrink-0">
              {copiado ? <CheckCircle2 size={14} className="text-green-400"/> : <Copy size={14}/>}
            </button>
          </div>
          <a href={urlPortal} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <ExternalLink size={12}/> Abrir portal en nueva pestaña
          </a>
          <p className="text-[10px] text-gray-600">
            Compartí esta URL con tus clientes. Pueden acceder ingresando su DNI.
          </p>
        </div>
      )}

      {/* Funciones habilitadas */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-5">
        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Funciones habilitadas</p>

        <Toggle k="mostrarPlanCuotas"
          label="Plan de cuotas"
          desc="El cliente puede ver todas sus cuotas con estado (pagada/vencida/pendiente)"
          icon={<CreditCard size={14}/>}/>

        <div className="h-px bg-gray-900"/>

        <Toggle k="mostrarHistorialPagos"
          label="Historial de pagos"
          desc="Lista de pagos registrados con fecha y monto"
          icon={<History size={14}/>}/>

        <div className="h-px bg-gray-900"/>

        <Toggle k="mostrarCertificados"
          label="Descarga de certificados"
          desc="Libre deuda, estado vigente y cuotas al día (según estado del crédito)"
          icon={<FileText size={14}/>}/>

        <div className="h-px bg-gray-900"/>

        <Toggle k="mostrarContactoAsesor"
          label="Contacto con asesor por WhatsApp"
          desc="Botón que abre WhatsApp con el teléfono del vendedor asignado"
          icon={<MessageSquare size={14}/>}/>
      </div>

      {/* Mensaje de bienvenida */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-3">
        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Mensaje de bienvenida</p>
        <p className="text-[10px] text-gray-600">Se muestra debajo del nombre del cliente al ingresar. Opcional.</p>
        <textarea
          value={config.mensajeBienvenida}
          onChange={e => set("mensajeBienvenida", e.target.value)}
          disabled={!puedeEditar}
          rows={3}
          maxLength={200}
          placeholder="Ej: Gracias por confiar en nosotros. Aquí podés consultar el estado de tu crédito."
          className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none resize-none disabled:opacity-50"/>
        <p className="text-[10px] text-gray-600 text-right">{config.mensajeBienvenida.length}/200</p>
      </div>

      {/* Info de seguridad */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 flex items-start gap-2 text-xs text-gray-500">
        <ShieldCheck size={12} className="shrink-0 mt-0.5 text-green-400"/>
        <p>El portal solo muestra información pública del crédito. No expone datos del legajo (fotos, firma) ni información sensible. El acceso se realiza únicamente por DNI.</p>
      </div>
    </div>
  );
}
