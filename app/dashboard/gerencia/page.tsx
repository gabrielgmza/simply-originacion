"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function GerenciaPage() {
  const { entidadData } = useAuth();
  const [stats, setStats] = useState({ capital: 0, ops: 0 });

  useEffect(() => {
    const loadStats = async () => {
      if (!entidadData?.id) return;
      const q = query(collection(db, "operaciones"), where("entidadId", "==", entidadData.id), where("estado", "==", "LIQUIDADO"));
      const snap = await getDocs(q);
      const total = snap.docs.reduce((acc, d) => acc + (d.data().financiero?.montoBruto || 0), 0);
      setStats({ capital: total, ops: snap.size });
    };
    loadStats();
  }, [entidadData]);

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-8">Centro de Gerencia</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl">
          <p className="text-gray-500 text-xs font-bold uppercase">Capital Colocado</p>
          <p className="text-4xl font-black mt-2">${stats.capital.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-3xl">
          <p className="text-gray-500 text-xs font-bold uppercase">Operaciones Totales</p>
          <p className="text-4xl font-black mt-2">{stats.ops}</p>
        </div>
      </div>
    </div>
  );
}
