'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../src/lib/firebase';
import { FileText, Search, Filter, MoreHorizontal, ArrowUpRight, Zap } from 'lucide-react';

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
    <div className="space-y-12 animate-in fade-in duration-1000 pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b dark:border-white/5 pb-10">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.5em] italic leading-none">
            <FileText className="w-3 h-3 fill-current" />
            <span>Master Registry</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter uppercase italic text-slate-950 dark:text-white leading-none">Activos</h1>
        </div>
        <div className="flex space-x-4">
           <div className="flex items-center bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 px-6 py-3.5 rounded-[1.5rem] shadow-sm w-80">
             <Search className="w-4 h-4 text-slate-400 mr-4" />
             <input placeholder="Filtrar activos..." className="bg-transparent border-none outline-none text-xs font-semibold leading-none" />
           </div>
           <button className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 p-4 rounded-[1.5rem] shadow-xl hover:scale-110 transition-all leading-none"><Filter className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-[#0b1224]/80 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto px-4 py-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b dark:border-white/5">
                <th className="p-8">Identidad Cliente</th>
                <th className="p-8 text-center">Origen / Red</th>
                <th className="p-8">Monto Principal</th>
                <th className="p-8">Liquidación</th>
                <th className="p-8 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 font-black">
              {ops.map(op => (
                <tr key={op.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="p-8">
                    <div className="flex items-center space-x-5">
                       <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg border border-white dark:border-white/5 transform group-hover:rotate-6 transition-transform leading-none text-xs">{op.clienteNombre?.charAt(0)}</div>
                       <div>
                         <p className="text-sm uppercase italic tracking-tighter text-slate-950 dark:text-white mb-1.5 leading-none">{op.clienteNombre}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">DNI {op.clienteDni}</p>
                       </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center justify-center text-[10px] uppercase tracking-widest bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10 w-fit mx-auto text-indigo-500 italic">
                      <Zap className="w-3 h-3 mr-2 fill-current" /> {op.entidadNombre}
                    </div>
                  </td>
                  <td className="p-8">
                    <p className="text-xl text-slate-950 dark:text-white tracking-tighter italic leading-none mb-2">${op.monto?.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Plan {op.cuotas} Meses • {op.sistema}</p>
                  </td>
                  <td className="p-8">
                    <p className="text-xl text-emerald-500 italic tracking-tighter leading-none mb-1.5">${op.valorCuota?.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">CFT: {op.cft?.toFixed(1)}%</span>
                  </td>
                  <td className="p-8 text-center">
                    <div className="flex items-center justify-center space-x-2">
                       <button className="bg-slate-100 dark:bg-white/5 p-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all transform group-hover:scale-110 leading-none"><ArrowUpRight className="w-4 h-4" /></button>
                       <button className="p-3 text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors leading-none"><MoreHorizontal className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && ops.length === 0 && (
          <div className="p-24 text-center">
             <FileText className="w-16 h-16 text-slate-200 dark:text-white/5 mx-auto mb-6" />
             <p className="text-sm font-black uppercase italic tracking-widest text-slate-400 leading-none">Canal sin activos registrados</p>
          </div>
        )}
      </div>
    </div>
  );
}
