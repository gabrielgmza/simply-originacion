"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Building2, Plus, Users, LayoutDashboard, LogOut, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const [entidades, setEntidades] = useState<any[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [procesandoAuth, setProcesandoAuth] = useState(false);

  const [mostrarModalEntidad, setMostrarModalEntidad] = useState(false);
  const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<any>(null);

  const [nuevaEntidad, setNuevaEntidad] = useState({ razonSocial: "", nombreFantasia: "", cuit: "", emailContacto: "", telefonoContacto: "" });
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", email: "", password: "" });

  useEffect(() => {
    if (!loading) {
      if (!userData || userData.rol !== "MASTER_PAYSUR") {
        router.push("/login");
      } else {
        cargarEntidades();
      }
    }
  }, [userData, loading, router]);

  const cargarEntidades = async () => {
    setCargandoDatos(true);
    try {
      const q = query(collection(db, "entidades"), orderBy("fechaCreacion", "desc"));
      const querySnapshot = await getDocs(q);
      const data: any[] = [];
      querySnapshot.forEach((document) => {
        data.push({ id: document.id, ...document.data() });
      });
      setEntidades(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setCargandoDatos(false);
    }
  };

  const handleCrearEntidad = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "entidades"), {
        razonSocial: nuevaEntidad.razonSocial,
        nombreFantasia: nuevaEntidad.nombreFantasia,
        cuit: nuevaEntidad.cuit,
        contacto: { email: nuevaEntidad.emailContacto, telefono: nuevaEntidad.telefonoContacto },
        configuracion: { tasaInteresBase: 0, gastosOtorgamiento: 0, colorPrimario: "#FF5E14", moduloAdelantos: true, moduloCuad: true, moduloPrivados: true },
        fechaCreacion: serverTimestamp()
      });
      setMostrarModalEntidad(false);
      setNuevaEntidad({ razonSocial: "", nombreFantasia: "", cuit: "", emailContacto: "", telefonoContacto: "" });
      cargarEntidades();
    } catch (error) {
      console.error("Error al crear entidad", error);
    }
  };

  const handleCrearGerente = async (e: React.FormEvent) => {
    e.preventDefault();
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
         rol: "GERENTE_GENERAL",
         entidadId: entidadSeleccionada.id,
         activo: true,
         fechaCreacion: serverTimestamp()
      });
      
      await signOut(secondaryAuth);
      
      alert(`Gerente ${nuevoUsuario.nombre} creado con exito para ${entidadSeleccionada.nombreFantasia}`);
      setMostrarModalUsuario(false);
      setNuevoUsuario({ nombre: "", email: "", password: "" });
    } catch (error: any) {
      console.error("Error Auth:", error);
      alert("Error al crear usuario. Verifica que la contraseña tenga 6 caracteres y el email no este en uso.");
    } finally {
      setProcesandoAuth(false);
    }
  };

  const abrirModalGerente = (entidad: any) => {
    setEntidadSeleccionada(entidad);
    setMostrarModalUsuario(true);
  };

  const cerrarSesion = () => {
    auth.signOut();
    router.push("/login");
  };

  if (loading || cargandoDatos) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#FF5E14]">Cargando...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-[#F8F9FA] font-sans">
      <nav className="border-b border-gray-800 bg-[#0A0A0A] p-4 flex justify-between items-center px-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-[#FF5E14]" />
          <h1 className="text-xl font-bold">Simply Core <span className="text-gray-500 font-normal">| SuperAdmin</span></h1>
        </div>
        <button onClick={cerrarSesion} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm">
          <LogOut size={16} /> Cerrar Sesion
        </button>
      </nav>

      <main className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold">Entidades Clientes</h2>
            <p className="text-gray-400 text-sm mt-1">Gestion de tenants y configuraciones base.</p>
          </div>
          <button onClick={() => setMostrarModalEntidad(true)} className="bg-[#FF5E14] hover:bg-[#E04D0B] text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Plus size={18} /> Alta de Entidad
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entidades.map((entidad) => (
            <div key={entidad.id} className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-gray-900 p-3 rounded-lg text-[#FF5E14]">
                    <Building2 size={24} />
                  </div>
                  <span className="text-xs font-mono text-gray-500 bg-gray-900 px-2 py-1 rounded">ID: {entidad.id.slice(0,6)}...</span>
                </div>
                <h3 className="text-xl font-bold mb-1">{entidad.nombreFantasia}</h3>
                <p className="text-sm text-gray-400 mb-4">{entidad.razonSocial} | CUIT: {entidad.cuit}</p>
              </div>
              <div className="border-t border-gray-800 pt-4 mt-2">
                <button onClick={() => abrirModalGerente(entidad)} className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                  <Users size={16} /> Crear Gerente General
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {mostrarModalUsuario && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-1">Crear Gerente</h3>
            <p className="text-sm text-gray-400 mb-4">Para la entidad: <span className="text-[#FF5E14] font-bold">{entidadSeleccionada?.nombreFantasia}</span></p>
            <form onSubmit={handleCrearGerente} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre Completo</label>
                <input type="text" required value={nuevoUsuario.nombre} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF5E14] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email de Acceso</label>
                <input type="email" required value={nuevoUsuario.email} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, email: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF5E14] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Contraseña (Min 6 caracteres)</label>
                <input type="password" required minLength={6} value={nuevoUsuario.password} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, password: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF5E14] focus:outline-none" />
              </div>
              
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setMostrarModalUsuario(false)} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">Cancelar</button>
                <button type="submit" disabled={procesandoAuth} className="flex-1 px-4 py-2 bg-[#FF5E14] text-white rounded-lg text-sm font-bold hover:bg-[#E04D0B] disabled:opacity-50">
                  {procesandoAuth ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
