"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Upload, Image as ImageIcon, CheckCircle, Loader2, Trash2, Info } from "lucide-react";

export default function MarcaConfig() {
  const { entidadData } = useAuth();
  const [logoUrl, setLogoUrl] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    if (entidadData?.configuracion?.logoUrl) {
      setLogoUrl(entidadData.configuracion.logoUrl);
    }
  }, [entidadData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendo(true);
    // Simulación de carga (aquí se usaría Firebase Storage)
    setTimeout(async () => {
      const fakeUrl = URL.createObjectURL(file); 
      setLogoUrl(fakeUrl);
      const ref = doc(db, "entidades", entidadData.id);
      await updateDoc(ref, { "configuracion.logoUrl": fakeUrl });
      setSubiendo(false);
    }, 1500);
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="p-8 max-w-5xl mx-auto text-white animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ImageIcon style={{ color: colorPrimario }} /> Personalización de Marca
        </h1>
        <p className="text-gray-400">Configura la identidad visual que verán tus empleados y en los documentos legales.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SUBIDA DE LOGO */}
        <div className="lg:col-span-2 bg-[#0A0A0A] border border-gray-800 p-8 rounded-3xl">
          <h3 className="text-sm font-black uppercase text-gray-500 mb-6 flex items-center gap-2">
            Logo de la Entidad <span className="text-[10px] bg-gray-900 px-2 py-0.5 rounded text-gray-400">PNG / Transparente</span>
          </h3>
          
          <div className="relative group border-2 border-dashed border-gray-800 rounded-3xl p-12 transition-all hover:border-gray-600 flex flex-col items-center justify-center bg-[#050505]">
            {logoUrl ? (
              <div className="relative group text-center">
                <img src={logoUrl} alt="Logo" className="max-h-40 object-contain mb-6 drop-shadow-2xl" />
                <button 
                  onClick={() => setLogoUrl("")} 
                  className="absolute -top-4 -right-4 p-2 bg-red-600 rounded-full text-white shadow-xl hover:scale-110 transition-transform"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="text-gray-500" size={32} />
                </div>
                <p className="text-sm font-medium text-gray-400">Arrastra tu logo aquí</p>
                <p className="text-[10px] text-gray-600 mt-2 italic">Tamaño recomendado: 512x512px</p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/png" 
              onChange={handleUpload} 
              className="absolute inset-0 opacity-0 cursor-pointer" 
            />
          </div>
          
          {subiendo && (
            <div className="mt-6 flex items-center gap-3 text-blue-400 justify-center font-medium animate-pulse">
              <Loader2 size={18} className="animate-spin" /> Procesando imagen corporativa...
            </div>
          )}
        </div>

        {/* PREVIEW & TIPS */}
        <div className="space-y-6">
          <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl">
            <h3 className="text-xs font-black uppercase text-gray-500 mb-4">Vista Previa Sidebar</h3>
            <div className="bg-[#050505] border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} className="w-8 h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ backgroundColor: colorPrimario }}>S</div>
              )}
              <span className="font-bold text-sm tracking-tight">Simply Core</span>
            </div>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-3xl">
            <div className="flex items-start gap-3">
              <Info className="text-blue-500 shrink-0" size={20} />
              <p className="text-xs text-blue-200/70 leading-relaxed">
                El logo cargado se aplicará automáticamente en:<br/><br/>
                • Cabecera de Legajos PDF<br/>
                • Mails de Notificación<br/>
                • Panel de Control del Empleado
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
