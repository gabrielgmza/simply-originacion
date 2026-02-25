"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { FileText, Clock, CheckCircle, AlertCircle, Search, Filter } from "lucide-react";

export default function OperacionesPage() {
  const { entidadData } = useAuth();
  const [ops, setOps] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      if (!entidadData?.id) return;
      const q = query(
        collection(db, "operaciones"), 
        where("entidadId", "==", entidadData.id)
      );
      const snap = await getDocs(q);
      setOps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
  }, [entidadData]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-white">Cartera de Legajos</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-600" size={18} />
            <input placeholder="Buscar por DNI..." className="bg-[#0A0A0A] border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-blue-500 transition-all" />
          </div>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-900 bg-gray-900/20">
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Cliente / DNI</th>
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Monto</th>
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado</th>
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">BCRA</th>
              <th className="p-5"></th>
            </tr>
          </thead>
          <tbody>
            {ops.map((op: any) => (
              <tr key={op.id} className="border-b border-gray-900 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/operaciones/${op.id}`)}>
                <td className="p-5">
                  <p className="font-bold text-white text-sm">{op.cliente?.nombre}</p>
                  <p className="text-xs text-gray-500 font-mono">{op.cliente?.dni}</p>
                </td>
                <td className="p-5 text-white font-bold">${op.financiero?.montoSolicitado.toLocaleString('es-AR')}</td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${op.estado === 'LIQUIDADO' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                    {op.estado}
                  </span>
                </td>
                <td className="p-5">
                   <span className={`font-bold ${op.cliente?.scoreBcra > 2 ? 'text-red-500' : 'text-green-500'}`}>Cat. {op.cliente?.scoreBcra || 1}</span>
                </td>
                <td className="p-5 text-right"><FileText size={18} className="text-gray-700 hover:text-white" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
