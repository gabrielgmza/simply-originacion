"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { MessageSquare, ShieldCheck, DollarSign, Save, Loader2, BellRing, AlertTriangle } from "lucide-react";

export default function ConfigNotificaciones() {
  const { entidadData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    ws_activo: false,
    ws_preventivo_48hs: false,
    ws_aviso_mora: false,
    ws_costo_por_mensaje: 0.05
  });

  useEffect(() => {
    if (entidadData?.configuracion?.notificaciones) {
      setConfig(entidadData.configuracion.notificaciones);
    }
  }, [entidadData]);

  const guardar = async () => {
    setLoading(true);
    try {
      const ref = doc(db, "entidades", entidadData.id);
      await updateDoc(ref, { "configuracion.notificaciones": config });
      alert("Configuración de notificaciones guardada.");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="p-8 max-w-4xl mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare style={{ color: colorPrimario }} /> Centro de Comunicaciones
        </h1>
        <p className="text-gray-400">Controla el envío automático de WhatsApp y sus costos operativos.</p>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-8 space-y-6">
        <div className="flex justify-between items-center p-6 bg-white/5 rounded-2xl border border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-bold text-lg">WhatsApp Business API</p>
              <p className="text-xs text-gray-500 font-mono tracking-tighter uppercase">Tarifa por envío: ${config.ws_costo_por_mensaje} USD</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={config.ws_activo} 
              onChange={(e) => setConfig({...config, ws_activo: e.target.checked})}
            />
            <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${!config.ws_activo && 'opacity-20 pointer-events-none grayscale'}`}>
          <div className="p-5 border border-gray-800 rounded-xl bg-[#050505]">
            <BellRing className="text-blue-500 mb-3" size={20} />
            <p className="text-sm font-bold mb-1">Recordatorio 48hs</p>
            <p className="text-xs text-gray-500 mb-4">Avisa al cliente antes del vencimiento para reducir mora temprana.</p>
            <input type="checkbox" checked={config.ws_preventivo_48hs} onChange={(e) => setConfig({...config, ws_preventivo_48hs: e.target.checked})} />
          </div>
          
          <div className="p-5 border border-gray-800 rounded-xl bg-[#050505]">
            <AlertTriangle className="text-amber-500 mb-3" size={20} />
            <p className="text-sm font-bold mb-1">Aviso de Mora (Día 1)</p>
            <p className="text-xs text-gray-500 mb-4">Notificación inmediata al detectar el primer día de atraso.</p>
            <input type="checkbox" checked={config.ws_aviso_mora} onChange={(e) => setConfig({...config, ws_aviso_mora: e.target.checked})} />
          </div>
        </div>

        <button 
          onClick={guardar}
          disabled={loading}
          className="w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: colorPrimario }}
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save />} Actualizar Configuración de Gastos
        </button>
      </div>
    </div>
  );
}
