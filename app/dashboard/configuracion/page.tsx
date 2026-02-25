"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Settings, Palette, Calculator, Save, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";

export default function ConfiguracionPage() {
  const { userData, entidadData } = useAuth();
  
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  
  const [config, setConfig] = useState({
    tasaInteresBase: 0,
    gastosOtorgamiento: 0,
    colorPrimario: "#FF5E14",
    moduloAdelantos: false,
    moduloCuad: false,
    moduloPrivados: false,
  });

  useEffect(() => {
    if (entidadData?.configuracion) {
      setConfig({
        tasaInteresBase: entidadData.configuracion.tasaInteresBase || 0,
        gastosOtorgamiento: entidadData.configuracion.gastosOtorgamiento || 0,
        colorPrimario: entidadData.configuracion.colorPrimario || "#FF5E14",
        moduloAdelantos: entidadData.configuracion.moduloAdelantos || false,
        moduloCuad: entidadData.configuracion.moduloCuad || false,
        moduloPrivados: entidadData.configuracion.moduloPrivados || false,
      });
    }
  }, [entidadData]);

  const guardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadData) return;
    setCargando(true);
    setMensaje("");

    try {
      const entidadRef = doc(db, "entidades", entidadData.id);
      await updateDoc(entidadRef, {
        "configuracion.tasaInteresBase": Number(config.tasaInteresBase),
        "configuracion.gastosOtorgamiento": Number(config.gastosOtorgamiento),
        "configuracion.colorPrimario": config.colorPrimario,
        fechaActualizacion: serverTimestamp()
      });
      
      setMensaje("Configuración actualizada. Recarga la página para ver los nuevos colores.");
    } catch (error) {
      console.error("Error al guardar:", error);
      setMensaje("Error al actualizar la configuración.");
    } finally {
      setCargando(false);
    }
  };

  if (!userData?.rol.includes("GERENTE")) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center">
        <ShieldAlert size={48} className="mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p>Solo los perfiles gerenciales pueden modificar las reglas de negocio.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-12 max-w-4xl mx-auto animate-fade-in font-sans">
      <div className="mb-10 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <Settings style={{ color: config.colorPrimario }} /> Ajustes de Entidad
        </h1>
        <p className="text-gray-400">Parametriza las reglas de negocio y apariencia de {entidadData?.nombreFantasia}.</p>
      </div>

      {mensaje && (
        <div className="mb-8 p-4 rounded-xl bg-green-950/30 border border-green-900/50 text-green-500 font-medium flex items-center gap-3">
          <CheckCircle2 size={20} />
          {mensaje}
        </div>
      )}

      <form onSubmit={guardarConfiguracion} className="space-y-8">
        
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
            <Calculator size={20} style={{ color: config.colorPrimario }} /> Parámetros Financieros
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Tasa de Interés Base (TNA %)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  value={config.tasaInteresBase}
                  onChange={(e) => setConfig({...config, tasaInteresBase: Number(e.target.value)})}
                  className="w-full bg-[#111] border border-gray-700 text-white rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:border-gray-500 transition-colors" 
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-500">%</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Se utilizará para el cálculo del CFT en el originador.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Gastos de Otorgamiento Fijos ($)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">$</div>
                <input 
                  type="number" 
                  value={config.gastosOtorgamiento}
                  onChange={(e) => setConfig({...config, gastosOtorgamiento: Number(e.target.value)})}
                  className="w-full bg-[#111] border border-gray-700 text-white rounded-lg pl-8 pr-4 py-3 focus:outline-none focus:border-gray-500 transition-colors" 
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Monto fijo que se suma al capital financiado.</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
            <Palette size={20} style={{ color: config.colorPrimario }} /> Marca Blanca (White Label)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Color Primario Institucional</label>
              <div className="flex gap-4 items-center">
                <input 
                  type="color" 
                  value={config.colorPrimario}
                  onChange={(e) => setConfig({...config, colorPrimario: e.target.value})}
                  className="w-14 h-14 rounded cursor-pointer bg-transparent border-0 p-0" 
                />
                <input 
                  type="text" 
                  value={config.colorPrimario.toUpperCase()}
                  onChange={(e) => setConfig({...config, colorPrimario: e.target.value})}
                  className="w-32 bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-2 font-mono text-sm focus:outline-none" 
                />
              </div>
              <p className="text-xs text-gray-500 mt-3">Define el color de los botones, íconos y links de firma de tus clientes.</p>
            </div>
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800 text-center">
              <p className="text-sm text-gray-400 mb-4">Vista Previa del Botón</p>
              <button disabled type="button" className="text-white font-bold py-3 px-8 rounded-lg shadow-lg opacity-90 transition-opacity" style={{ backgroundColor: config.colorPrimario }}>
                Botón Principal
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={cargando}
            className="flex items-center justify-center gap-2 text-white font-bold py-3 px-8 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: config.colorPrimario }}
          >
            {cargando ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {cargando ? "Guardando..." : "Guardar Configuraciones"}
          </button>
        </div>
      </form>
    </div>
  );
}
