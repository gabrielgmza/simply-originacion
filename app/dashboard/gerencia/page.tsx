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
    const loadStats = async () => {
      if (!entidadData?.id) return;
      const q = query(collection(db, "operaciones"), where("entidadId", "==", entidadData.id));
      const snap = await getDocs(q);
      
      let totalCapital = 0;
      let enMora = 0;
      
      snap.docs.forEach(d => {
        const data = d.data();
        totalCapital += (data.financiero?.montoBruto || 0);
        if (data.estado === "EN_MORA") enMora++;
      });

      setStats({ capital: totalCapital, ops: snap.size, mora: enMora });
    };
    loadStats();
  }, [entidadData]);

  return (
    <div className="p-8 text-white animate-in fade-in duration-700">
      <h1 className="text-3xl font-black mb-2 tracking-tighter">Centro de Gerencia</h1>
      <p className="text-gray-500 mb-10 text-sm">Resumen operativo de {entidadData?.nombre || "la entidad"}.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl relative overflow-hidden">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Capital Bruto</p>
          <p className="text-3xl font-black mt-2">${stats.capital.toLocaleString('es-AR')}</p>
          <TrendingUp className="absolute bottom-2 right-2 text-green-500/20" size={48} />
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Operaciones</p>
          <p className="text-3xl font-black mt-2">{stats.ops}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">En Mora</p>
          <p className="text-3xl font-black mt-2 text-red-500">{stats.mora}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Equipo</p>
          <p className="text-3xl font-black mt-2">2</p>
        </div>
      </div>
    </div>
  );
}
