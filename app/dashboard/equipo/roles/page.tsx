"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Shield, ShieldCheck, UserCircle, Save, Loader2, Lock, Eye, Trash2 } from "lucide-react";

export default function RolesPermisosPage() {
  const { entidadData } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [permisos, setPermisos] = useState({
    verCBU: false,
    liquidarCreditos: false,
    editarTasas: false,
    descargarLegajos: false,
    verFondeadores: false,
    anularOperaciones: false
  });

  useEffect(() => {
    const cargarUsuarios = async () => {
      if (!entidadData?.id) return;
      const q = query(collection(db, "usuarios"), where("entidadId", "==", entidadData.id));
      const snap = await getDocs(q);
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    cargarUsuarios();
  }, [entidadData]);

  const seleccionarUsuario = (user: any) => {
    setUsuarioSeleccionado(user);
    setPermisos({
      verCBU: user.permisos?.verCBU || false,
      liquidarCreditos: user.permisos?.liquidarCreditos || false,
      editarTasas: user.permisos?.editarTasas || false,
      descargarLegajos: user.permisos?.descargarLegajos || false,
      verFondeadores: user.permisos?.verFondeadores || false,
      anularOperaciones: user.permisos?.anularOperaciones || false
    });
  };

  const guardarPermisos = async () => {
    if (!usuarioSeleccionado) return;
    setCargando(true);
    try {
      await updateDoc(doc(db, "usuarios", usuarioSeleccionado.id), { permisos });
      alert("Permisos actualizados con éxito");
    } catch (error) {
      console.error(error);
    } finally { setCargando(false); }
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="p-8 max-w-6xl mx-auto text-white">
      <div className="mb-10 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3"><Shield style={{ color: colorPrimario }} /> Roles y Permisos Granulares</h1>
        <p className="text-gray-400 font-medium">Define qué acciones específicas puede realizar cada miembro de tu equipo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LISTA DE USUARIOS */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-4 bg-white/5 border-b border-gray-800 font-bold text-xs uppercase tracking-widest text-gray-400">Miembros de la Entidad</div>
          <div className="divide-y divide-gray-900">
            {usuarios.map(u => (
              <div 
                key={u.id} 
                onClick={() => seleccionarUsuario(u)}
                className={`p-4 cursor-pointer transition-colors flex items-center gap-3 ${usuarioSeleccionado?.id === u.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <UserCircle size={20} className={usuarioSeleccionado?.id === u.id ? 'text-white' : 'text-gray-600'} />
                <div>
                  <p className="text-sm font-bold">{u.email.split('@')[0]}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-black">{u.rol}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL DE PERMISOS */}
        <div className="lg:col-span-2 bg-[#0A0A0A] border border-gray-800 rounded-2xl p-8">
          {!usuarioSeleccionado ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-600">
              <Lock size={48} className="mb-4 opacity-20" />
              <p>Selecciona un usuario para editar su ramificación de permisos</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                Configurando acceso para: <span style={{ color: colorPrimario }}>{usuarioSeleccionado.email}</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(permisos).map((key) => (
                  <div 
                    key={key} 
                    onClick={() => setPermisos({...permisos, [key]: !permisos[key as keyof typeof permisos]})}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      permisos[key as keyof typeof permisos] ? 'border-[#FF5E14] bg-[#FF5E14]/5' : 'border-gray-800 bg-[#050505]'
                    }`}
                  >
                    <span className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${permisos[key as keyof typeof permisos] ? 'bg-[#FF5E14] border-[#FF5E14]' : 'border-gray-700'}`}>
                      {permisos[key as keyof typeof permisos] && <ShieldCheck size={14} className="text-white" />}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={guardarPermisos}
                disabled={cargando}
                className="mt-8 w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-transform active:scale-95"
                style={{ backgroundColor: colorPrimario }}
              >
                {cargando ? <Loader2 className="animate-spin" /> : <Save />} Guardar Ramificación de Roles
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
