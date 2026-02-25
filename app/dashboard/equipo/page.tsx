"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Users, Shield, Mail, CheckCircle } from "lucide-react";

export default function EquipoPage() {
  const { entidadData } = useAuth();
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!entidadData?.id) return;
      const q = query(collection(db, "usuarios"), where("entidadId", "==", entidadData.id));
      const snap = await getDocs(q);
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    loadUsers();
  }, [entidadData]);

  return (
    <div className="p-8 text-white animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3"><Users className="text-blue-500"/> Equipo de Trabajo</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {usuarios.map((u: any) => (
          <div key={u.id} className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center font-bold">{u.email[0].toUpperCase()}</div>
              <div>
                <p className="font-bold">{u.email}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{u.rol}</p>
              </div>
            </div>
            <Shield size={18} className="text-green-500 opacity-50" />
          </div>
        ))}
      </div>
    </div>
  );
}
