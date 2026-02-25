"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function CarteraPage() {
  const { entidadData } = useAuth();
  const [ops, setOps] = useState([]);

  useEffect(() => {
    const fetchOps = async () => {
      if (!entidadData?.id) return;
      const q = query(collection(db, "operaciones"), where("entidadId", "==", entidadData.id));
      const snap = await getDocs(q);
      setOps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchOps();
  }, [entidadData]);

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">Cartera Activa</h1>
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
        <p className="text-gray-400">Total de operaciones encontradas: {ops.length}</p>
      </div>
    </div>
  );
}
