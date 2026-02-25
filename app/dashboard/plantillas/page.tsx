"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { FileSignature, UploadCloud, FileText, Loader2, Trash2, Plus, LayoutTemplate, ShieldAlert } from "lucide-react";

export default function PlantillasPage() {
  const { userData, entidadData } = useAuth();
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  
  const [mostrarModal, setMostrarModal] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nombreDocumento, setNombreDocumento] = useState("");
  const [tipoLinea, setTipoLinea] = useState("TODAS");

  const cargarPlantillas = async () => {
    if (!entidadData?.id) return;
    setCargando(true);
    try {
      const q = query(collection(db, "plantillas"), where("entidadId", "==", entidadData.id));
      const querySnapshot = await getDocs(q);
      const data: any[] = [];
      querySnapshot.forEach((documento) => {
        data.push({ id: documento.id, ...documento.data() });
      });
      setPlantillas(data);
    } catch (error) {
      console.error("Error al cargar plantillas:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPlantillas();
  }, [entidadData]);

  const handleSubirPlantilla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo || !entidadData?.id) return;
    setSubiendo(true);

    try {
      const fileName = `plantillas/${entidadData.id}/${Date.now()}_${archivo.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, archivo);
      const urlBase = await getDownloadURL(storageRef);

      await addDoc(collection(db, "plantillas"), {
        entidadId: entidadData.id,
        nombre: nombreDocumento,
        tipoLinea: tipoLinea,
        archivoUrl: urlBase,
        storagePath: fileName,
        fechaCreacion: serverTimestamp(),
        mapeoConfigurado: false 
      });

      setMostrarModal(false);
      setArchivo(null);
      setNombreDocumento("");
      cargarPlantillas();
    } catch (error) {
      console.error("Error al subir:", error);
      alert("Hubo un error al subir el documento.");
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarPlantilla = async (id: string, path: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta plantilla?")) return;
    setCargando(true);
    try {
      const fileRef = ref(storage, path);
      await deleteObject(fileRef).catch(() => console.log("El archivo ya no existe en storage"));
      await deleteDoc(doc(db, "plantillas", id));
      cargarPlantillas();
    } catch (error) {
      console.error("Error al eliminar:", error);
    } finally {
      setCargando(false);
    }
  };

  if (!userData?.rol.includes("GERENTE")) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center">
        <ShieldAlert size={48} className="mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p>Solo gerencia puede gestionar la documentacion legal.</p>
      </div>
    );
  }

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in font-sans text-[#F8F9FA]">
      <div className="flex justify-between items-end mb-10 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <FileSignature style={{ color: colorPrimario }} /> Documentación Legal
          </h1>
          <p className="text-gray-400">Administra los Pagarés y Mutuos base para las firmas digitales.</p>
        </div>
        <button 
          onClick={() => setMostrarModal(true)}
          className="text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-opacity hover:opacity-90"
          style={{ backgroundColor: colorPrimario }}
        >
          <Plus size={18} /> Subir Nuevo PDF
        </button>
      </div>

      {cargando ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plantillas.map((plan) => (
            <div key={plan.id} className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 flex flex-col relative group hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gray-900 rounded-lg text-white" style={{ color: colorPrimario }}>
                  <FileText size={24} />
                </div>
                <span className="text-xs bg-gray-900 border border-gray-800 px-2 py-1 rounded text-gray-400">
                  {plan.tipoLinea}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{plan.nombre}</h3>
              <p className="text-xs text-gray-500 mb-6">Subido: {plan.fechaCreacion ? new Date(plan.fechaCreacion.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
              
              <div className="mt-auto flex gap-2">
                <button 
                  className="flex-1 bg-[#111] hover:bg-gray-800 border border-gray-800 text-white text-sm py-2 rounded-lg flex justify-center items-center gap-2 transition-colors"
                >
                  <LayoutTemplate size={16} /> Mapear Campos
                </button>
                <button 
                  onClick={() => eliminarPlantilla(plan.id, plan.storagePath)}
                  className="px-3 bg-red-950/30 hover:bg-red-900 text-red-500 hover:text-white border border-red-900/50 rounded-lg transition-colors flex items-center justify-center"
                  title="Eliminar Plantilla"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {plantillas.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-gray-800 rounded-xl bg-[#0A0A0A]">
              <UploadCloud size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">Sin plantillas configuradas</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">Sube un documento PDF en blanco. Luego podrás indicarle al sistema en qué coordenadas exactas debe imprimir el DNI y la firma del cliente.</p>
            </div>
          )}
        </div>
      )}

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              <UploadCloud style={{ color: colorPrimario }} /> Subir Documento Base
            </h3>
            <form onSubmit={handleSubirPlantilla} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Comercial (Ej: Mutuo Adelantos)</label>
                <input 
                  type="text" 
                  required 
                  value={nombreDocumento} 
                  onChange={(e)=>setNombreDocumento(e.target.value)} 
                  className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:border-gray-500 focus:outline-none transition-colors" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Linea de Credito Asociada</label>
                <select 
                  value={tipoLinea} 
                  onChange={(e)=>setTipoLinea(e.target.value)} 
                  className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:border-gray-500 focus:outline-none transition-colors"
                >
                  <option value="TODAS">Aplica para todas las lineas</option>
                  <option value="ADELANTO">Solo Adelantos</option>
                  <option value="CUAD">Solo CUAD (Gobierno)</option>
                  <option value="PRIVADO">Solo Privados</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Archivo PDF</label>
                <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center hover:border-gray-500 transition-colors bg-[#111]">
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    required 
                    onChange={(e)=>setArchivo(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-800 file:text-white hover:file:bg-gray-700"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">Cancelar</button>
                <button type="submit" disabled={subiendo} className="flex-1 px-4 py-3 text-white rounded-lg font-bold opacity-90 hover:opacity-100 disabled:opacity-50 transition-opacity flex justify-center items-center" style={{ backgroundColor: colorPrimario }}>
                  {subiendo ? <Loader2 className="animate-spin" size={20} /> : "Subir PDF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
