"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Users, Shield, Mail, Trash2, UserPlus, Loader2, CheckCircle } from "lucide-react";

export default function EquipoPage() {
  const { entidadData } = useAuth();
  const [equipo, setEquipo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoRol, setNuevoRol] = useState("VENDEDOR");

  const cargarEquipo = async () => {
    if (!entidadData?.id) return;
    const q = query(collection(db, "usuarios"), where("entidadId", "==", entidadData.id));
    const snap = await getDocs(q);
    setEquipo(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { cargarEquipo(); }, [entidadData]);

  const agregarMiembro = async () => {
    if (!nuevoEmail || loading) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "usuarios"), {
        email: nuevoEmail,
        rol: nuevoRol,
        entidadId: entidadData.id,
        fechaAlta: new Date().toISOString()
      });
      setNuevoEmail("");
      await cargarEquipo();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const cambiarRol = async (uid, rol) => {
    await updateDoc(doc(db, "usuarios", uid), { rol });
    await cargarEquipo();
  };

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white mb-8">Gestión de Equipo</h1>
      
      {/* FORMULARIO ALTA */}
      <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[32px] mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Email del Nuevo Usuario</label>
          <input value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} placeholder="ejemplo@simply.com" className="w-full bg-[#050505] border border-gray-800 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500" />
        </div>
        <div className="w-48">
          <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Asignar Rol</label>
          <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)} className="w-full bg-[#050505] border border-gray-800 p-3 rounded-xl text-white text-sm outline-none">
            <option value="VENDEDOR">VENDEDOR</option>
            <option value="LIQUIDADOR">LIQUIDADOR</option>
            <option value="GERENTE">GERENTE</option>
          </select>
        </div>
        <button onClick={agregarMiembro} disabled={loading} className="bg-white text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-all">
          {loading ? <Loader2 className="animate-spin" size={18}/> : <UserPlus size={18}/>} Agregar
        </button>
      </div>

      {/* LISTA DE EQUIPO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {equipo.map((u: any) => (
          <div key={u.id} className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center font-bold text-blue-500">{u.email[0].toUpperCase()}</div>
              <div>
                <p className="text-sm font-bold text-white">{u.email}</p>
                <select onChange={(e) => cambiarRol(u.id, e.target.value)} value={u.rol} className="bg-transparent text-[10px] text-gray-500 font-black uppercase outline-none cursor-pointer hover:text-white transition-colors">
                  <option value="VENDEDOR">VENDEDOR</option>
                  <option value="LIQUIDADOR">LIQUIDADOR</option>
                  <option value="GERENTE">GERENTE</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
