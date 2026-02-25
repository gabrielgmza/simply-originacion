"use client";
import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Save, Loader2, Upload } from "lucide-react";

export default function MarcaConfig() {
  const { entidadData } = useAuth();
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entidadData?.configuracion?.logoUrl) setLogoUrl(entidadData.configuracion.logoUrl);
  }, [entidadData]);

  const guardarCambios = async () => {
    if (!entidadData?.id || !logoUrl) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.logoUrl": logoUrl
      });
      alert("¡Identidad de marca actualizada!");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 text-white">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Identidad de Marca</h1>
        <button 
          onClick={guardarCambios}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[40px] flex flex-col items-center justify-center border-dashed relative">
          {logoUrl ? (
            <img src={logoUrl} className="max-h-40 object-contain" />
          ) : (
            <div className="text-center text-gray-600">
              <Upload size={48} className="mx-auto mb-4 opacity-20" />
              <p>Arrastra el logo aquí</p>
            </div>
          )}
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setLogoUrl(URL.createObjectURL(file));
            }}
          />
        </div>
        
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <h3 className="text-xs font-black uppercase text-gray-500 mb-6">Preview Sidebar</h3>
          <div className="w-64 bg-[#050505] p-4 rounded-2xl border border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
               {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain" /> : "S"}
            </div>
            <span className="font-bold">Simply Core</span>
          </div>
        </div>
      </div>
    </div>
  );
}
