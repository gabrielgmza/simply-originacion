"use client";
// app/dashboard/configuracion/email/page.tsx
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Mail, Save, Loader2, AlertTriangle, CheckCircle2, Send } from "lucide-react";

const EVENTOS: { key: string; label: string; desc: string; destinatario: "cliente" | "gerente" }[] = [
  { key: "CREDITO_APROBADO",      label: "Crédito aprobado",           desc: "Al cliente cuando su crédito es aprobado",              destinatario: "cliente"  },
  { key: "CREDITO_LIQUIDADO",     label: "Crédito liquidado",          desc: "Al cliente con monto y CBU cuando se transfieren fondos", destinatario: "cliente"  },
  { key: "COBRO_EXITOSO",         label: "Cobro exitoso",              desc: "Al cliente cada vez que se debita una cuota",            destinatario: "cliente"  },
  { key: "COBRO_RECHAZADO",       label: "Cobro rechazado",            desc: "Al cliente cuando el débito es rechazado",               destinatario: "cliente"  },
  { key: "CREDITO_EN_MORA",       label: "Crédito en mora",            desc: "Al cliente cuando pasa a estado de mora",                destinatario: "cliente"  },
  { key: "RENOVACION_DISPONIBLE", label: "Renovación disponible",      desc: "Al cliente cuando puede renovar su crédito",             destinatario: "cliente"  },
  { key: "RESUMEN_DIARIO",        label: "Resumen diario",             desc: "Al gerente cada mañana con métricas del día anterior",   destinatario: "gerente"  },
  { key: "ALERTA_MORA_CRITICA",   label: "Alerta mora crítica",        desc: "Al gerente cuando hay créditos con más de 15 días en mora", destinatario: "gerente" },
];

export default function ConfigEmailPage() {
  const { entidadData } = useAuth();
  const colorPrimario   = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [cfg,       setCfg]       = useState<Record<string, any>>({});
  const [guardando, setGuardando] = useState(false);
  const [guardado,  setGuardado]  = useState(false);
  const [testando,  setTestando]  = useState(false);
  const moduloHabilitado = (entidadData as any)?.modulosHabilitados?.email === true;

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      const snap = await getDoc(doc(db, "entidades", entidadData.id));
      const data = snap.data() as any;
      setCfg(data?.configuracion?.email || {});
    };
    cargar();
  }, [entidadData]);

  const toggle = (key: string) => setCfg(p => ({ ...p, [key]: p[key] === false ? true : false }));

  const guardar = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.email": cfg
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } finally { setGuardando(false); }
  };

  const enviarTest = async () => {
    const email = entidadData?.contacto?.email;
    if (!email) { alert("Configurá un email de contacto en los datos de la entidad."); return; }
    setTestando(true);
    try {
      const res = await fetch("/api/email/test", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ entidadId: entidadData?.id, to: email }),
      });
      const data = await res.json();
      alert(data.ok ? `✅ Email de prueba enviado a ${email}` : `❌ Error: ${data.error}`);
    } finally { setTestando(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Mail size={20} style={{ color: colorPrimario }}/> Notificaciones por Email
        </h1>
        <p className="text-gray-500 text-sm mt-1">Configurá qué eventos envían email automáticamente.</p>
      </div>

      {/* Aviso si módulo no habilitado */}
      {!moduloHabilitado && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-yellow-900/10 border border-yellow-900/40 text-yellow-400 text-sm">
          <AlertTriangle size={15}/>
          El módulo de email no está habilitado en tu plan. Contactá a Paysur para activarlo.
        </div>
      )}

      {/* API Key y remitente */}
      <div className={`bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4 ${!moduloHabilitado ? "opacity-50 pointer-events-none" : ""}`}>
        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Credenciales Resend</p>

        <div>
          <label className="text-xs text-gray-500 font-bold uppercase mb-1.5 block">API Key de Resend</label>
          <input type="password" value={cfg.resendApiKey || ""} onChange={e => setCfg(p=>({...p,resendApiKey:e.target.value}))}
            placeholder="re_..."
            className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono outline-none focus:border-gray-600"/>
          <p className="text-[10px] text-gray-600 mt-1">Si lo dejás vacío se usa la API Key de Paysur (puede tener costo adicional).</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 font-bold uppercase mb-1.5 block">Email remitente</label>
          <input type="email" value={cfg.emailRemitente || ""} onChange={e => setCfg(p=>({...p,emailRemitente:e.target.value}))}
            placeholder="notificaciones@tuentidad.com"
            className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gray-600"/>
          <p className="text-[10px] text-gray-600 mt-1">El dominio debe estar verificado en Resend.</p>
        </div>

        <button onClick={enviarTest} disabled={testando}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-xs font-bold disabled:opacity-50">
          {testando ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>}
          Enviar email de prueba
        </button>
      </div>

      {/* Eventos — clientes */}
      <div className={`bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-3 ${!moduloHabilitado ? "opacity-50 pointer-events-none" : ""}`}>
        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Eventos para clientes</p>
        {EVENTOS.filter(e => e.destinatario === "cliente").map(ev => (
          <div key={ev.key} className="flex items-center justify-between gap-3 py-2 border-b border-gray-900 last:border-0">
            <div>
              <p className="text-sm font-bold text-white">{ev.label}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{ev.desc}</p>
            </div>
            <button onClick={() => toggle(ev.key)} type="button"
              className="w-10 h-5 rounded-full transition-all relative shrink-0"
              style={{ backgroundColor: cfg[ev.key] !== false ? colorPrimario : "#374151" }}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${cfg[ev.key] !== false ? "left-5" : "left-0.5"}`}/>
            </button>
          </div>
        ))}
      </div>

      {/* Eventos — gerente */}
      <div className={`bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-3 ${!moduloHabilitado ? "opacity-50 pointer-events-none" : ""}`}>
        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Eventos para gerencia</p>
        {EVENTOS.filter(e => e.destinatario === "gerente").map(ev => (
          <div key={ev.key} className="flex items-center justify-between gap-3 py-2 border-b border-gray-900 last:border-0">
            <div>
              <p className="text-sm font-bold text-white">{ev.label}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{ev.desc}</p>
            </div>
            <button onClick={() => toggle(ev.key)} type="button"
              className="w-10 h-5 rounded-full transition-all relative shrink-0"
              style={{ backgroundColor: cfg[ev.key] !== false ? colorPrimario : "#374151" }}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${cfg[ev.key] !== false ? "left-5" : "left-0.5"}`}/>
            </button>
          </div>
        ))}
      </div>

      {/* Guardar */}
      <button onClick={guardar} disabled={guardando || !moduloHabilitado}
        className="w-full py-3.5 rounded-2xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:brightness-110"
        style={{ backgroundColor: colorPrimario }}>
        {guardando   ? <Loader2 size={15} className="animate-spin"/> :
         guardado    ? <><CheckCircle2 size={15}/> Guardado</> :
         <><Save size={15}/> Guardar configuración</>}
      </button>
    </div>
  );
}
