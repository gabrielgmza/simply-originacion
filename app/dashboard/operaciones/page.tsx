'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../src/lib/firebase';
import { FileText, Search, Filter, Download, MoreHorizontal, User, Calendar, DollarSign } from 'lucide-react';

export default function OperacionesPage() {
  const [ops, setOps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOps();
  }, []);

  const fetchOps = async () => {
    try {
      const q = query(collection(db, 'operaciones'), orderBy('fechaCreacion', 'desc'));
      const snap = await getDocs(q);
      setOps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b dark:border-white/5 pb-10">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.5em] italic">
            <FileText className="w-3 h-3 fill-current" />
            <span>Registro Central de Activos</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter uppercase italic text-slate-950 dark:text-white leading-none">Operaciones</h1>
        </div>
        <div className="flex space-x-4">
           <div className="flex items-center bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 px-6 py-3 rounded-2xl shadow-sm">
             <Search className="w-4 h-4 text-slate-400 mr-4" />
             <input placeholder="Buscar por DNI..." className="bg-transparent border-none outline-none text-xs font-semibold placeholder:text-slate-300" />
           </div>
           <button className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 p-4 rounded-2xl shadow-xl hover:scale-105 transition-all"><Filter className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-[#0b1224]/80 backdrop-blur-xl rounded-[3rem] shadow-xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cliente / Origen</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Detalle Plan</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cuota Mensual</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Estado</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5">
              {ops.map(op => (
                <tr key={op.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="p-8">
                    <div className="flex items-center space-x-5">
                       <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-indigo-500 font-black italic shadow-inner border border-white dark:border-white/5">{op.clienteNombre?.charAt(0)}</div>
                       <div>
                         <p className="text-sm font-black uppercase italic tracking-tighter text-slate-950 dark:text-white leading-none mb-2">{op.clienteNombre}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{op.entidadNombre}</p>
                       </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <p className="text-xl font-black text-slate-950 dark:text-white tracking-tighter italic leading-none mb-2">${op.monto?.toLocaleString()}</p>
                    <div className="flex items-center space-x-3 text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                       <span>{op.cuotas} Meses</span>
                       <span className="w-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full"></span>
                       <span>Sist. {op.sistema}</span>
                    </div>
                  </td>
                  <td className="p-8">
                    <p className="text-xl font-black text-emerald-600 italic tracking-tighter leading-none">${op.valorCuota?.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">CFT: {op.cft?.toFixed(1)}%</p>
                  </td>
                  <td className="p-8">
                    <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                       {op.estado}
                    </span>
                  </td>
                  <td className="p-8 text-center">
                    <button className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group-hover:scale-125 duration-300">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ops.length === 0 && !loading && (
          <div className="p-24 text-center">
             <FileText className="w-16 h-16 text-slate-200 dark:text-white/5 mx-auto mb-6" />
             <p className="text-sm font-black uppercase italic tracking-widest text-slate-400">Sin operaciones registradas en el Core</p>
          </div>
        )}
      </div>
    </div>
  );
}
