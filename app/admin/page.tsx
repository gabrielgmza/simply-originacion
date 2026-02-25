"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Building2, Plus, Users, LayoutDashboard, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function AdminDashboard() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const [entidades, setEntidades] = useState<any[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaEntidad, setNuevaEntidad] = useState({
    razonSocial: "",
    nombreFantasia: "",
    cuit: "",
    emailContacto: "",
    telefonoContacto: ""
  });

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
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setEntidades(data);
    } catch (error) {
      console.error("Error al cargar entidades:", error);
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
        contacto: {
          email: nuevaEntidad.emailContacto,
          telefono: nuevaEntidad.telefonoContacto
        },
        configuracion: {
          tasaInteresBase: 0,
          gastosOtorgamiento: 0,
          colorPrimario: "#FF5E14",
          moduloAdelantos: true,
          moduloCuad: true,
          moduloPrivados: true
        },
        fechaCreacion: serverTimestamp()
      });
      setMostrarModal(false);
      setNuevaEntidad({ razonSocial: "", nombreFantasia: "", cuit: "", emailContacto: "", telefonoContacto: "" });
      cargarEntidades();
    } catch (error) {
      console.error("Error al crear entidad", error);
    }
  };

  const cerrarSesion = () => {
    auth.signOut();
    router.push("/login");
  };

  if (loading || cargandoDatos) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#FF5E14]">Cargando...</div>;
  }

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
          <button 
            onClick={() => setMostrarModal(true)}
            className="bg-[#FF5E14] hover:bg-[#E04D0B] text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> Alta de Entidad
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entidades.map((entidad) => (
            <div key={entidad.id} className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-gray-900 p-3 rounded-lg text-[#FF5E14]">
                  <Building2 size={24} />
                </div>
                <span className="text-xs font-mono text-gray-500 bg-gray-900 px-2 py-1 rounded">ID: {entidad.id.slice(0,6)}...</span>
              </div>
              <h3 className="text-xl font-bold mb-1">{entidad.nombreFantasia}</h3>
              <p className="text-sm text-gray-400 mb-4">{entidad.razonSocial} | CUIT: {entidad.cuit}</p>
              
              <div className="border-t border-gray-800 pt-4 flex gap-4">
                <button className="text-sm text-[#FF5E14] hover:text-white transition-colors">Configurar Modulos</button>
                <button className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                  <Users size={14} /> Accesos
                </button>
              </div>
            </div>
          ))}

          {entidades.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-xl">
              No hay entidades registradas en el sistema.
            </div>
          )}
        </div>
      </main>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Nueva Entidad Cliente</h3>
            <form onSubmit={handleCrearEntidad} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nombre de Fantasia</label>
                  <input type="text" required value={nuevaEntidad.nombreFantasia} onChange={(e)=>setNuevaEntidad({...nuevaEntidad, nombreFantasia: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF5E14] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Razon Social</label>
                  <input type="text" required value={nuevaEntidad.razonSocial} onChange={(e)=>setNuevaEntidad({...nuevaEntidad, razonSocial: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF5E14] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">CUIT</label>
                <input type="text" required value={nuevaEntidad.cuit} onChange={(e)=>setNuevaEntidad({...nuevaEntidad, cuit: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF5E14] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email de Contacto</label>
                  <input type="email" required value={nuevaEntidad.emailContacto} onChange={(e)=>setNuevaEntidad({...nuevaEntidad, emailContacto: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF5E14] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Telefono</label>
                  <input type="text" required value={nuevaEntidad.telefonoContacto} onChange={(e)=>setNuevaEntidad({...nuevaEntidad, telefonoContacto: e.target.value})} className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF5E14] focus:outline-none" />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-[#FF5E14] text-white rounded-lg text-sm font-bold hover:bg-[#E04D0B]">Guardar Entidad</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
