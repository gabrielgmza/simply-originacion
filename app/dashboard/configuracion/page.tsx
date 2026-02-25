"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Settings, Palette, Calculator, Save, Loader2, CheckCircle2, ShieldAlert, Percent } from "lucide-react";

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
    colorPrimario: "#FF5E14"
  });

  useEffect(() => {
    if (entidadData?.configuracion) {
      setConfig({
        tasaInteresBase: entidadData.configuracion.tasaInteresBase || 0,
        gastosOtorgamientoPorc: entidadData.configuracion.gastosOtorgamientoPorc || 0,
        seguroVidaPorc: entidadData.configuracion.seguroVidaPorc || 0,
        interesPunitorioPorc: entidadData.configuracion.interesPunitorioPorc || 0,
        interesMoratorioPorc: entidadData.configuracion.interesMoratorioPorc || 0,
        colorPrimario: entidadData.configuracion.colorPrimario || "#FF5E14",
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
        fechaActualizacion: serverTimestamp()
      });
      setMensaje("Parámetros actualizados correctamente.");
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error(error);
      setMensaje("Error al guardar.");
    } finally { setCargando(false); }
  };

  if (!userData?.rol.includes("GERENTE")) return <div className="p-12 text-center text-gray-500">Acceso Restringido</div>;

  const colorPrimario = config.colorPrimario;

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in text-[#F8F9FA]">
      <div className="mb-10 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings style={{ color: colorPrimario }} /> Reglas de Negocio
        </h1>
        <p className="text-gray-400">Configura tasas porcentuales y costos operativos.</p>
      </div>

      {mensaje && <div className="mb-6 p-4 bg-green-950/30 border border-green-900/50 text-green-500 rounded-xl flex items-center gap-2"><CheckCircle2 size={20}/> {mensaje}</div>}

      <form onSubmit={guardarConfiguracion} className="space-y-6">
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
            <Percent size={20} style={{ color: colorPrimario }} /> Tasas y Recargos (%)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-2">TNA (Tasa Nominal Anual)</label>
              <input type="number" step="0.01" value={config.tasaInteresBase} onChange={e => setConfig({...config, tasaInteresBase: Number(e.target.value)})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-2">Gto. Otorgamiento (%)</label>
              <input type="number" step="0.01" value={config.gastosOtorgamientoPorc} onChange={e => setConfig({...config, gastosOtorgamientoPorc: Number(e.target.value)})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-2">Seguro de Vida (%)</label>
              <input type="number" step="0.01" value={config.seguroVidaPorc} onChange={e => setConfig({...config, seguroVidaPorc: Number(e.target.value)})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg focus:outline-none" />
            </div>
             <div>
              <label className="block text-xs text-gray-500 uppercase mb-2">Int. Punitorio Mensual (%)</label>
              <input type="number" step="0.01" value={config.interesPunitorioPorc} onChange={e => setConfig({...config, interesPunitorioPorc: Number(e.target.value)})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={cargando} className="flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ backgroundColor: colorPrimario }}>
            {cargando ? <Loader2 className="animate-spin" /> : <Save />} Guardar Configuración
          </button>
        </div>
      </form>
    </div>
  );
}
