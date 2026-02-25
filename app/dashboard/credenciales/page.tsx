"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Key, Plus, Trash2, ShieldAlert, Loader2, EyeOff, CheckCircle } from "lucide-react";

export default function CredencialesPage() {
  const { userData, entidadData } = useAuth();
  const [credenciales, setCredenciales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaCredencial, setNuevaCredencial] = useState({
    usuarioGobierno: "",
    passwordGobierno: "",
    etiqueta: ""
  });

  const cargarCredenciales = async () => {
    if (!entidadData?.id) return;
    setCargando(true);
    try {
      const q = query(collection(db, "credencialesCuad"), where("entidadId", "==", entidadData.id));
      const querySnapshot = await getDocs(q);
      const data: any[] = [];
      querySnapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      setCredenciales(data);
    } catch (error) {
      console.error("Error al cargar credenciales:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCredenciales();
  }, [entidadData]);

  const handleGuardarCredencial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadData?.id) return;
    setProcesando(true);

    try {
      await addDoc(collection(db, "credencialesCuad"), {
        entidadId: entidadData.id,
        usuarioGobierno: nuevaCredencial.usuarioGobierno,
        passwordGobierno: nuevaCredencial.passwordGobierno,
        etiqueta: nuevaCredencial.etiqueta,
        activa: true,
        enUsoPorBot: false,
        fechaCreacion: serverTimestamp()
      });

      setMostrarModal(false);
      setNuevaCredencial({ usuarioGobierno: "", passwordGobierno: "", etiqueta: "" });
      cargarCredenciales();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar la credencial.");
    } finally {
      setProcesando(false);
    }
  };

  const eliminarCredencial = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta credencial del pool? El bot dejara de utilizarla inmediatamente.")) return;
    setCargando(true);
    try {
      await deleteDoc(doc(db, "credencialesCuad", id));
      cargarCredenciales();
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
        <p>Solo gerencia puede gestionar el pool de cuentas de gobierno.</p>
      </div>
    );
  }

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in font-sans text-[#F8F9FA]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <Key style={{ color: colorPrimario }} /> Pool de Credenciales CUAD
          </h1>
          <p className="text-gray-400">Bóveda de cuentas oficiales asignadas por el Gobierno de Mendoza.</p>
        </div>
        <button 
          onClick={() => setMostrarModal(true)}
          className="text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-opacity hover:opacity-90 w-full md:w-auto justify-center"
          style={{ backgroundColor: colorPrimario }}
        >
          <Plus size={18} /> Agregar Credencial
        </button>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-[#111] border-b border-gray-800 flex items-center gap-3 text-sm text-gray-400">
          <ShieldAlert size={16} className="text-yellow-500" />
          <p>Estas credenciales serán utilizadas exclusivamente por el motor de Web Scraping para encolar consultas y emitir comprobantes (CAD).</p>
        </div>
        
        {cargando ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" size={40} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#111] border-b border-gray-800">
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Etiqueta / Asignación</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuario (Mendoza)</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contraseña</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {credenciales.map((cred) => (
                  <tr key={cred.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{cred.etiqueta || "Sin etiqueta"}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-gray-300 text-sm bg-gray-900 px-2 py-1 rounded border border-gray-800">
                        {cred.usuarioGobierno}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <EyeOff size={16} />
                        <span className="font-mono tracking-widest text-lg leading-none">••••••••</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center w-fit gap-1 px-2.5 py-1 bg-green-950/30 text-green-500 border border-green-900/50 rounded-full text-xs font-medium">
                        <CheckCircle size={12}/> Activa
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => eliminarCredencial(cred.id)}
                        className="p-2 bg-red-950/30 hover:bg-red-900 text-red-500 hover:text-white border border-red-900/50 rounded-lg transition-colors inline-flex"
                        title="Eliminar Credencial"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {credenciales.length === 0 && (
              <div className="p-16 text-center text-gray-500">
                <Key size={48} className="mx-auto text-gray-700 mb-4" />
                <p className="text-lg font-medium text-gray-300">El pool está vacío.</p>
                <p className="text-sm mt-1">Agrega tu primer usuario gubernamental para habilitar el motor CUAD.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              <Key style={{ color: colorPrimario }} /> Nueva Credencial
            </h3>
            <form onSubmit={handleGuardarCredencial} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Identificador Interno (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Sucursal Centro / Vendedor 1"
                  value={nuevaCredencial.etiqueta} 
                  onChange={(e)=>setNuevaCredencial({...nuevaCredencial, etiqueta: e.target.value})} 
                  className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:border-gray-500 focus:outline-none transition-colors" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Usuario Portal Gobierno</label>
                <input 
                  type="text" 
                  required
                  placeholder="Usuario asignado"
                  value={nuevaCredencial.usuarioGobierno} 
                  onChange={(e)=>setNuevaCredencial({...nuevaCredencial, usuarioGobierno: e.target.value})} 
                  className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-gray-500 focus:outline-none transition-colors" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Contraseña Oficial</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={nuevaCredencial.passwordGobierno} 
                  onChange={(e)=>setNuevaCredencial({...nuevaCredencial, passwordGobierno: e.target.value})} 
                  className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-gray-500 focus:outline-none transition-colors" 
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">Cancelar</button>
                <button type="submit" disabled={procesando} className="flex-1 px-4 py-3 text-white rounded-lg font-bold opacity-90 hover:opacity-100 disabled:opacity-50 transition-opacity flex justify-center items-center" style={{ backgroundColor: colorPrimario }}>
                  {procesando ? <Loader2 className="animate-spin" size={20} /> : "Guardar en Bóveda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
