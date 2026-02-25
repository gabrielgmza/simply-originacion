"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { FileText, ChevronRight, Search, Filter, Calendar } from "lucide-react";

export default function CarteraPage() {
  const { entidadData } = useAuth();
  const [ops, setOps] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      if (!entidadData?.id) return;
      const q = query(
        collection(db, "operaciones"), 
        where("entidadId", "==", entidadData.id),
        orderBy("fechaCreacion", "desc")
      );
      const snap = await getDocs(q);
      setOps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
  }, [entidadData]);

  const filtradas = ops.filter(op => 
    op.cliente?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    op.cliente?.dni?.includes(busqueda)
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">Cartera Activa</h1>
        <div className="flex gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-2 flex items-center gap-3">
            <Search size={16} className="text-gray-500" />
            <input 
              placeholder="Buscar por nombre o DNI..." 
              className="bg-transparent text-sm outline-none text-white w-64"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-400 hover:text-white transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[40px] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-white/[0.02] border-b border-gray-900">
            <tr>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Expediente</th>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Liquidación</th>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Riesgo</th>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado</th>
              <th className="p-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {filtradas.map((op: any) => (
              <tr key={op.id} className="hover:bg-white/[0.02] cursor-pointer group transition-all" onClick={() => router.push(`/dashboard/operaciones/${op.id}`)}>
                <td className="p-6">
                  <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{op.cliente?.nombre || "Legajo S/N"}</p>
                  <p className="text-xs text-gray-600 font-mono mt-1">{op.cliente?.dni}</p>
                </td>
                <td className="p-6">
                  <p className="font-black text-white text-lg">${op.financiero?.montoSolicitado?.toLocaleString('es-AR')}</p>
                  <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">Capital Bruto</p>
                </td>
                <td className="p-6">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${op.cliente?.scoreBcra > 2 ? 'bg-red-500/5 border-red-500/10 text-red-500' : 'bg-green-500/5 border-green-500/10 text-green-500'}`}>
                    <span className="text-[10px] font-black uppercase">Cat {op.cliente?.scoreBcra || 1}</span>
                  </div>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${op.estado === 'LIQUIDADO' ? 'bg-green-600 text-white' : 'bg-amber-600 text-white'}`}>
                    {op.estado}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-gray-600 group-hover:text-white group-hover:bg-blue-600 transition-all">
                    <ChevronRight size={18} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
