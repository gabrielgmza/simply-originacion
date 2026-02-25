"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Users, Shield, ShieldAlert, CheckCircle, Mail } from "lucide-react";

export default function EquipoPage() {
  const { entidadData } = useAuth();
  const [equipo, setEquipo] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!entidadData?.id) return;
      const q = query(collection(db, "usuarios"), where("entidadId", "==", entidadData.id));
      const snap = await getDocs(q);
      setEquipo(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
  }, [entidadData]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-white">Equipo de Trabajo</h1>
        <button className="bg-white text-black px-6 py-2 rounded-xl font-bold text-sm">+ Nuevo Vendedor</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {equipo.map((u: any) => (
          <div key={u.id} className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-[32px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center font-bold text-white border border-gray-800">
                {u.email[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-white">{u.email}</p>
                <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{u.rol}</span>
              </div>
            </div>
            {u.rol === 'GERENTE_GENERAL' ? <ShieldAlert className="text-amber-500" /> : <Shield className="text-green-500" />}
          </div>
        ))}
      </div>
    </div>
  );
}
