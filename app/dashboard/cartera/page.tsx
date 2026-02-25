"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { FileText, ChevronRight, Landmark, Search } from "lucide-react";

export default function CarteraPage() {
  const { entidadData } = useAuth();
  const [ops, setOps] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      if (!entidadData?.id) return;
      const q = query(collection(db, "operaciones"), where("entidadId", "==", entidadData.id));
      const snap = await getDocs(q);
      setOps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
  }, [entidadData]);

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white mb-8">Cartera Activa</h1>
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Cliente</th>
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Monto</th>
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado</th>
              <th className="p-5"></th>
            </tr>
          </thead>
          <tbody>
            {ops.map((op: any) => (
              <tr key={op.id} className="border-b border-gray-900 hover:bg-white/[0.02] cursor-pointer" onClick={() => router.push(`/dashboard/operaciones/${op.id}`)}>
                <td className="p-5">
                  <p className="font-bold text-white">{op.cliente?.nombre || "N/A"}</p>
                  <p className="text-xs text-gray-500">{op.cliente?.dni || "S/D"}</p>
                </td>
                <td className="p-5 font-bold text-white">${op.financiero?.montoSolicitado?.toLocaleString('es-AR')}</td>
                <td className="p-5">
                  <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase">
                    {op.estado}
                  </span>
                </td>
                <td className="p-5 text-right"><ChevronRight className="text-gray-700" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
