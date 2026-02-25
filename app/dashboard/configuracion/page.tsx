"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Settings, Save, Loader2, CheckCircle2, Percent, CreditCard, ShieldCheck, Zap } from "lucide-react";

export default function ConfiguracionPage() {
  const { userData, entidadData } = useAuth();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  
  const [config, setConfig] = useState({
    tasaInteresBase: 0,
    gastosOtorgamientoPorc: 0,
    seguroVidaPorc: 0,
    interesPunitorioPorc: 0,
    interesMoratorioPorc: 0,
    colorPrimario: "#FF5E14",
    p360_apiKey: "",
    p360_adhesionId: "",
    mp_accessToken: ""
  });

  useEffect(() => {
    if (entidadData?.configuracion) {
      const c = entidadData.configuracion;
      setConfig({
        tasaInteresBase: c.tasaInteresBase || 0,
        gastosOtorgamientoPorc: c.gastosOtorgamientoPorc || 0,
        seguroVidaPorc: c.seguroVidaPorc || 0,
        interesPunitorioPorc: c.interesPunitorioPorc || 0,
        interesMoratorioPorc: c.interesMoratorioPorc || 0,
        colorPrimario: c.colorPrimario || "#FF5E14",
        p360_apiKey: c.pagos360?.apiKey || "",
        p360_adhesionId: c.pagos360?.adhesionId || "",
        mp_accessToken: c.mercadoPago?.accessToken || ""
      });
    }
  }, [entidadData]);

  const guardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadData) return;
    setCargando(true);
    try {
      const entidadRef = doc(db, "entidades", entidadData.id);
      await updateDoc(entidadRef, {
        "configuracion.tasaInteresBase": Number(config.tasaInteresBase),
        "configuracion.gastosOtorgamientoPorc": Number(config.gastosOtorgamientoPorc),
        "configuracion.seguroVidaPorc": Number(config.seguroVidaPorc),
        "configuracion.interesPunitorioPorc": Number(config.interesPunitorioPorc),
        "configuracion.interesMoratorioPorc": Number(config.interesMoratorioPorc),
        "configuracion.colorPrimario": config.colorPrimario,
        "configuracion.pagos360.apiKey": config.p360_apiKey,
        "configuracion.pagos360.adhesionId": config.p360_adhesionId,
        "configuracion.mercadoPago.accessToken": config.mp_accessToken,
        fechaActualizacion: serverTimestamp()
      });
      setMensaje("Configuración y Credenciales actualizadas.");
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      setMensaje("Error al guardar.");
    } finally { setCargando(false); }
  };

  if (!userData?.rol.includes("GERENTE")) return <div className="p-12 text-center text-gray-500">Acceso Restringido</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto text-[#F8F9FA] animate-fade-in">
      <div className="mb-10 border-b border-gray-800 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings style={{ color: config.colorPrimario }} /> Configuración Global
          </h1>
          <p className="text-gray-400">Administra tasas y pasarelas de pago de la entidad.</p>
        </div>
        {mensaje && <div className="p-3 bg-green-950/30 border border-green-900/50 text-green-500 rounded-lg flex items-center gap-2 text-sm"><CheckCircle2 size={16}/> {mensaje}</div>}
      </div>

      <form onSubmit={guardarConfiguracion} className="space-y-8">
        {/* BLOQUE FINANCIERO */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            <Percent size={20} style={{ color: config.colorPrimario }} /> Parámetros de Crédito
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase">TNA (%)</label>
              <input type="number" step="0.01" value={config.tasaInteresBase} onChange={e => setConfig({...config, tasaInteresBase: Number(e.target.value)})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-xl focus:border-gray-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase">Seguro de Vida (%)</label>
              <input type="number" step="0.01" value={config.seguroVidaPorc} onChange={e => setConfig({...config, seguroVidaPorc: Number(e.target.value)})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-xl focus:border-gray-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase">Gastos Otorg. (%)</label>
              <input type="number" step="0.01" value={config.gastosOtorgamientoPorc} onChange={e => setConfig({...config, gastosOtorgamientoPorc: Number(e.target.value)})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-xl focus:border-gray-500 outline-none" />
            </div>
          </div>
        </div>

        {/* BLOQUE PAGOS360 */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            <CreditCard size={20} style={{ color: config.colorPrimario }} /> Pasarela Pagos360
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase">API Key (Producción/Sandbox)</label>
              <input type="password" value={config.p360_apiKey} onChange={e => setConfig({...config, p360_apiKey: e.target.value})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-xl focus:border-gray-500 outline-none font-mono" placeholder="p360_..." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase">ID de Adhesión CBU</label>
              <input type="text" value={config.p360_adhesionId} onChange={e => setConfig({...config, p360_adhesionId: e.target.value})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-xl focus:border-gray-500 outline-none" placeholder="ID de cuenta" />
            </div>
          </div>
          <p className="mt-4 text-[10px] text-gray-600 flex items-center gap-1"><ShieldCheck size={12}/> Las claves se almacenan de forma cifrada en el servidor.</p>
        </div>

        {/* BLOQUE MERCADO PAGO */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            <Zap size={20} style={{ color: config.colorPrimario }} /> Mercado Pago (Opcional)
          </h2>
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase">Access Token</label>
            <input type="password" value={config.mp_accessToken} onChange={e => setConfig({...config, mp_accessToken: e.target.value})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-xl focus:border-gray-500 outline-none font-mono" placeholder="APP_USR-..." />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={cargando} className="flex items-center gap-2 px-12 py-4 rounded-2xl font-bold text-white transition-all hover:opacity-90 active:scale-95" style={{ backgroundColor: config.colorPrimario }}>
            {cargando ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Guardar Cambios Maestros
          </button>
        </div>
      </form>
    </div>
  );
}
