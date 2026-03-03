"use client";
import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle, Save, Loader2, CheckCircle2,
  ToggleLeft, ToggleRight, Clock, Percent,
  MessageSquare, Bell, Info
} from "lucide-react";

const DEFAULT_MORA = {
  cronActivo:          true,
  diasGracia:          3,
  aplicarPunitorio:    true,
  tasaPunitoriaDiaria: 0.12,
  aplicarMoratorio:    false,
  tasaMoratoriaDiaria: 0.033,
  notificarWhatsapp:   true,
  diasNotifWA:         [1, 5, 15],
  notificarInterna:    true,
};

export default function ConfigMoraPage() {
  const { entidadData, userData } = useAuth();
  const [cfg, setCfg]         = useState(DEFAULT_MORA);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const puedeEditar = ["GERENTE_GENERAL", "MASTER_PAYSUR"].includes(userData?.rol || "");

  useEffect(() => {
    if (entidadData?.configuracion?.mora) {
      setCfg({ ...DEFAULT_MORA, ...entidadData.configuracion.mora });
    }
  }, [entidadData]);

  const guardar = async () => {
    if (!entidadData?.id || !puedeEditar) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.mora": cfg,
        fechaActualizacion: serverTimestamp(),
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e) { console.error(e); alert("Error al guardar."); }
    finally { setGuardando(false); }
  };

  const toggle = (key: keyof typeof cfg) =>
    setCfg(p => ({ ...p, [key]: !p[key as keyof typeof p] }));

  const toggleDiaWA = (dia: number) =>
    setCfg(p => ({
      ...p,
      diasNotifWA: p.diasNotifWA.includes(dia)
        ? p.diasNotifWA.filter(d => d !== dia)
        : [...p.diasNotifWA, dia].sort((a, b) => a - b),
    }));

  const numInput = (key: keyof typeof cfg, label: string, step = 0.01, suffix = "%") => (
    <div>
      <label className="block text-xs text-gray-500 uppercase font-bold mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number" step={step} min={0}
          value={(cfg as any)[key]}
          onChange={e => setCfg(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
          disabled={!puedeEditar}
          className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">{suffix}</span>
      </div>
    </div>
  );

  const toggleRow = (key: keyof typeof cfg, label: string, desc: string, icon: React.ReactNode) => (
    <div className="flex items-center justify-between bg-gray-900/50 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="text-gray-500">{icon}</div>
        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="text-xs text-gray-500">{desc}</p>
        </div>
      </div>
      <button onClick={() => puedeEditar && toggle(key)} disabled={!puedeEditar}>
        {(cfg as any)[key]
          ? <ToggleRight size={28} className="text-green-400" />
          : <ToggleLeft  size={28} className="text-gray-600" />}
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Política de Mora</h1>
          <p className="text-gray-500 text-sm mt-1">Configuración del cron nocturno · Ejecuta a las 2:00 AM</p>
        </div>
        {guardado && (
          <span className="flex items-center gap-2 text-green-400 text-sm font-bold">
            <CheckCircle2 size={15}/> Guardado
          </span>
        )}
      </div>

      {/* CRON MASTER TOGGLE */}
      <div className={`border-2 rounded-2xl p-5 transition-all ${cfg.cronActivo ? "border-green-800/50 bg-green-900/10" : "border-gray-800 bg-[#0A0A0A]"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-white text-lg">Cron nocturno activo</p>
            <p className="text-xs text-gray-500 mt-0.5">Si está desactivado, no se procesará ninguna mora automáticamente</p>
          </div>
          <button onClick={() => puedeEditar && toggle("cronActivo")} disabled={!puedeEditar}>
            {cfg.cronActivo
              ? <ToggleRight size={36} className="text-green-400" />
              : <ToggleLeft  size={36} className="text-gray-600" />}
          </button>
        </div>
      </div>

      {/* DÍAS DE GRACIA */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-gray-500" />
          <p className="font-bold text-white text-sm uppercase tracking-widest text-xs">Días de gracia</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2, 3, 5, 7].map(d => (
            <button key={d} onClick={() => puedeEditar && setCfg(p => ({ ...p, diasGracia: d }))}
              disabled={!puedeEditar}
              className="w-12 h-12 rounded-xl font-black text-sm border transition-all"
              style={cfg.diasGracia === d
                ? { backgroundColor: colorPrimario, borderColor: colorPrimario, color: "#fff" }
                : { backgroundColor: "transparent", borderColor: "#374151", color: "#9ca3af" }}>
              {d}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">Días tras el vencimiento antes de computar mora</p>
      </div>

      {/* PUNITORIO */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent size={15} className="text-orange-400" />
            <p className="font-bold text-white text-sm">Interés punitorio</p>
          </div>
          <button onClick={() => puedeEditar && toggle("aplicarPunitorio")} disabled={!puedeEditar}>
            {cfg.aplicarPunitorio
              ? <ToggleRight size={26} className="text-orange-400" />
              : <ToggleLeft  size={26} className="text-gray-600" />}
          </button>
        </div>
        {cfg.aplicarPunitorio && (
          <div className="pt-2 border-t border-gray-800">
            {numInput("tasaPunitoriaDiaria", "Tasa diaria (%)", 0.01)}
            <p className="text-xs text-gray-600 mt-1.5">
              Ejemplo: 0.12% diario sobre el capital para {30} días = {(0.12 * 30).toFixed(1)}% mensual
            </p>
          </div>
        )}
      </div>

      {/* MORATORIO */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent size={15} className="text-yellow-400" />
            <p className="font-bold text-white text-sm">Interés moratorio</p>
          </div>
          <button onClick={() => puedeEditar && toggle("aplicarMoratorio")} disabled={!puedeEditar}>
            {cfg.aplicarMoratorio
              ? <ToggleRight size={26} className="text-yellow-400" />
              : <ToggleLeft  size={26} className="text-gray-600" />}
          </button>
        </div>
        {cfg.aplicarMoratorio && (
          <div className="pt-2 border-t border-gray-800">
            {numInput("tasaMoratoriaDiaria", "Tasa diaria (%)", 0.001)}
          </div>
        )}
      </div>

      {/* NOTIFICACIONES */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-3">
        <p className="font-bold text-white text-sm uppercase tracking-widest text-xs mb-1">Notificaciones</p>
        {toggleRow("notificarInterna", "Notificación interna", "Alerta al equipo de cobranzas al entrar en mora", <Bell size={15}/>)}
        {toggleRow("notificarWhatsapp", "WhatsApp al cliente", "Requiere WhatsApp Business API configurado", <MessageSquare size={15}/>)}

        {cfg.notificarWhatsapp && (
          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs text-gray-500 uppercase font-bold mb-2">Enviar en los días de mora:</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 5, 7, 10, 15, 30].map(d => (
                <button key={d} onClick={() => puedeEditar && toggleDiaWA(d)}
                  disabled={!puedeEditar}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs border transition-all"
                  style={cfg.diasNotifWA.includes(d)
                    ? { backgroundColor: "#25D36622", borderColor: "#25D366", color: "#25D366" }
                    : { backgroundColor: "transparent", borderColor: "#374151", color: "#6b7280" }}>
                  Día {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* INFO */}
      <div className="flex items-start gap-3 bg-blue-900/10 border border-blue-900/30 rounded-2xl p-4">
        <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-300">
          El cron se ejecuta automáticamente a las <strong>2:00 AM</strong> todos los días.
          Procesa todas las operaciones activas de esta entidad, calcula días de mora desde el vencimiento de cada cuota,
          actualiza el estado a <strong>EN_MORA</strong> y registra el recargo acumulado.
        </p>
      </div>

      {/* GUARDAR */}
      {puedeEditar && (
        <button onClick={guardar} disabled={guardando}
          className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ backgroundColor: colorPrimario }}>
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar configuración de mora
        </button>
      )}
    </div>
  );
}
