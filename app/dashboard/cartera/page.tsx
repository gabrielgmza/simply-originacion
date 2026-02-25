"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { FileText, ChevronRight, Landmark, Search, ShieldCheck } from "lucide-react";

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
      <div className="flex justify-between items-end mb-8">
        <div>
           <h1 className="text-3xl font-black text-white italic">Cartera Activa</h1>
           <p className="text-gray-500 text-sm">Control de legajos y estados de liquidación.</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-2 flex items-center gap-2">
           <Search size={16} className="text-gray-500" />
           <input placeholder="Buscar por DNI..." className="bg-transparent text-sm outline-none text-white" />
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Solicitante</th>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Capital</th>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">BCRA</th>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado</th>
              <th className="p-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {ops.map((op: any) => (
              <tr key={op.id} className="hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={() => router.push(`/dashboard/operaciones/${op.id}`)}>
                <td className="p-6">
                  <p className="font-bold text-white">{op.cliente?.nombre || "Legajo Pendiente"}</p>
                  <p className="text-xs text-gray-500 font-mono">{op.cliente?.dni || "S/D"}</p>
                </td>
                <td className="p-6 font-bold text-white">${op.financiero?.montoSolicitado?.toLocaleString('es-AR')}</td>
                <td className="p-6">
                  <span className={`font-bold ${op.cliente?.scoreBcra > 2 ? 'text-red-500' : 'text-green-500'}`}>Cat. {op.cliente?.scoreBcra || 1}</span>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${op.estado === 'LIQUIDADO' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {op.estado}
                  </span>
                </td>
                <td className="p-6 text-right"><ChevronRight className="text-gray-700" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
