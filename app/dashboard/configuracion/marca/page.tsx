"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Upload, ImageIcon, Save, Loader2, Trash2, CheckCircle } from "lucide-react";

export default function MarcaConfig() {
  const { entidadData } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (entidadData?.configuracion?.logoUrl) {
      setPreviewUrl(entidadData.configuracion.logoUrl);
    }
  }, [entidadData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setSuccess(false);
    }
  };

  const guardarLogo = async () => {
    if (!file || !entidadData?.id) return;
    setLoading(true);

    try {
      // 1. Subir a Firebase Storage
      const storageRef = ref(storage, `logos/${entidadData.id}/logo_corporativo.png`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Actualizar Firestore
      const entidadRef = doc(db, "entidades", entidadData.id);
      await updateDoc(entidadRef, {
        "configuracion.logoUrl": downloadURL
      });

      setSuccess(true);
      alert("¡Logo guardado y sincronizado con éxito!");
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al subir el logo. Verifica permisos de Storage.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">Identidad de Marca</h1>
          <p className="text-gray-400 text-sm">El logo se aplicará en Sidebar, PDFs y Mails.</p>
        </div>
        {file && (
          <button 
            onClick={guardarLogo}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-2xl font-bold transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save />} 
            Guardar Logo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-[#0A0A0A] border border-gray-800 p-8 rounded-3xl relative">
          <div className="border-2 border-dashed border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center bg-[#050505] relative overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} className="max-h-48 object-contain drop-shadow-2xl" />
            ) : (
              <Upload size={48} className="text-gray-700 mb-4" />
            )}
            <input type="file" accept="image/png" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-4 uppercase font-bold tracking-widest">Click en la caja para cambiar imagen</p>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl h-fit">
          <h3 className="text-xs font-black text-gray-500 uppercase mb-4 tracking-tighter">Preview en Sidebar</h3>
          <div className="bg-[#050505] p-4 rounded-2xl border border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
              {previewUrl ? <img src={previewUrl} className="w-full h-full object-contain p-1" /> : "S"}
            </div>
            <span className="font-bold text-sm">Simply Core</span>
          </div>
          {success && <div className="mt-6 p-3 bg-green-500/10 text-green-500 rounded-xl text-xs flex items-center gap-2"><CheckCircle size={14}/> Sincronizado</div>}
        </div>
      </div>
    </div>
  );
}
