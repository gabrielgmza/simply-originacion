"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { Users, Plus, UserPlus, Mail, ShieldAlert, Loader2, UserCircle } from "lucide-react";
import { UsuarioApp } from "@/types";

export default function EquipoPage() {
  const { userData, entidadData } = useAuth();
  const [equipo, setEquipo] = useState<UsuarioApp[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoAuth, setProcesandoAuth] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "VENDEDOR"
  });

  const cargarEquipo = async () => {
    if (!userData?.entidadId) return;
    setCargando(true);
    try {
      const q = query(collection(db, "usuarios"), where("entidadId", "==", userData.entidadId));
      const querySnapshot = await getDocs(q);
      const data: UsuarioApp[] = [];
      querySnapshot.forEach((document) => {
        data.push(document.data() as UsuarioApp);
      });
      setEquipo(data);
    } catch (error) {
      console.error("Error al cargar equipo:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEquipo();
  }, [userData]);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadData || !userData) return;
    setProcesandoAuth(true);
    try {
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };
      
      let secondaryApp;
      const apps = getApps();
      const secondaryAppExists = apps.find(app => app.name === "SecondaryApp");
      if (secondaryAppExists) {
          secondaryApp = secondaryAppExists;
      } else {
          secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      }
      
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, nuevoUsuario.email, nuevoUsuario.password);
      
      await setDoc(doc(db, "usuarios", userCredential.user.uid), {
         uid: userCredential.user.uid,
         email: nuevoUsuario.email,
         nombre: nuevoUsuario.nombre,
         rol: nuevoUsuario.rol,
         entidadId: entidadData.id,
         activo: true,
         fechaCreacion: serverTimestamp()
      });
      
      await signOut(secondaryAuth);
      
      setMostrarModal(false);
      setNuevoUsuario({ nombre: "", email: "", password: "", rol: "VENDEDOR" });
      cargarEquipo();
    } catch (error: any) {
      console.error("Error Auth:", error);
      alert("Error al crear usuario. Verifica credenciales.");
    } finally {
      setProcesandoAuth(false);
    }
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  if (cargando) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-500" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users style={{ color: colorPrimario }} /> Gestión de Equipo
          </h1>
          <p className="text-gray-400">Administra los accesos y roles de tu entidad.</p>
        </div>
        <button 
          onClick={() => setMostrarModal(true)}
          className="text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-opacity hover:opacity-90"
          style={{ backgroundColor: colorPrimario }}
        >
          <UserPlus size={18} /> Nuevo Miembro
        </button>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#111] border-b border-gray-800">
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuario</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rol de Acceso</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {equipo.map((miembro) => (
              <tr key={miembro.uid} className="hover:bg-gray-900/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                      <UserCircle size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-white">{miembro.nombre}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={12}/> {miembro.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-full text-xs font-medium" style={{ color: colorPrimario }}>
                    {miembro.rol.replace("_", " ")}
                  </span>
                </td>
                <td className="p-4">
                  {miembro.activo ? (
                    <span className="px-3 py-1 bg-green-950/30 text-green-500 border border-green-900/50 rounded-full text-xs font-medium">Activo</span>
                  ) : (
                    <span className="px-3 py-1 bg-red-950/30 text-red-500 border border-red-900/50 rounded-full text-xs font-medium">Inactivo</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button className="text-xs text-gray-500 hover:text-white transition-colors">Editar Permisos</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {equipo.length === 0 && (
          <div className="p-10 text-center text-gray-500">No se encontraron usuarios registrados.</div>
        )}
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShieldAlert style={{ color: colorPrimario }} size={20} /> Alta de Operador
            </h3>
            <form onSubmit={handleCrearUsuario} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre Completo</label>
                <input type="text" required value={nuevoUsuario.nombre} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-gray-500 focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email Corporativo</label>
                <input type="email" required value={nuevoUsuario.email} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, email: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-gray-500 focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Contraseña temporal (Min 6 caracteres)</label>
                <input type="password" required minLength={6} value={nuevoUsuario.password} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, password: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-gray-500 focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rol en el Sistema</label>
                <select value={nuevoUsuario.rol} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, rol: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-gray-500 focus:outline-none transition-colors">
                  <option value="VENDEDOR">Vendedor / Comercial</option>
                  <option value="LIQUIDADOR">Liquidador (Aprobador)</option>
                  <option value="COBRANZAS">Gestor de Cobranzas</option>
                  <option value="GERENTE_SUCURSAL">Gerente de Sucursal</option>
                </select>
              </div>
              
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
                <button type="submit" disabled={procesandoAuth} className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-bold opacity-90 hover:opacity-100 disabled:opacity-50 transition-opacity" style={{ backgroundColor: colorPrimario }}>
                  {procesandoAuth ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Crear Operador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
