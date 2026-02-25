"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { TrendingUp, Users, AlertCircle, Landmark } from "lucide-react";

export default function GerenciaPage() {
  const { entidadData } = useAuth();
  const [stats, setStats] = useState({ capital: 0, ops: 0, mora: 0 });

  useEffect(() => {
    const load = async () => {
      if (!entidadData?.id) return;
      const q = query(collection(db, "operaciones"), where("entidadId", "==", entidadData.id));
      const snap = await getDocs(q);
      let cap = 0;
      snap.docs.forEach(d => {
        const val = d.data().financiero?.montoSolicitado || 0;
        cap += val;
      });
      setStats({ capital: cap, ops: snap.size, mora: 0 });
    };
    load();
  }, [entidadData]);

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">Centro de Gerencia</h1>
      <p className="text-gray-500 mb-10 text-sm italic">Sincronizado con {entidadData?.nombre}.</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl border-l-green-600 border-l-4">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Capital Colocado</p>
          <p className="text-3xl font-black text-white mt-2">${stats.capital.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Operaciones</p>
          <p className="text-3xl font-black text-white mt-2">{stats.ops}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Alertas Mora</p>
          <p className="text-3xl font-black text-red-500 mt-2">0</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Equipo Activo</p>
          <p className="text-3xl font-black text-white mt-2">2</p>
        </div>
      </div>
    </div>
  );
}
