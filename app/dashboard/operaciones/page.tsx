'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
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
          <h1 className="text-6xl font-black tracking-tighter uppercase italic text-slate-950 dark:text-white leading-none italic">Activos</h1>
        </div>
        <div className="flex space-x-4">
           <div className="flex items-center bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 px-6 py-3.5 rounded-[1.5rem] shadow-sm w-80">
             <Search className="w-4 h-4 text-slate-400 mr-4" />
             <input placeholder="Filtrar activos..." className="bg-transparent border-none outline-none text-xs font-semibold italic uppercase leading-none" />
           </div>
           <button className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 p-4 rounded-[1.5rem] shadow-xl hover:scale-110 transition-all leading-none italic"><Filter className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-[#0b1224]/80 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto px-4 py-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b dark:border-white/5 italic">
                <th className="p-8">Identidad Cliente</th>
                <th className="p-8 text-center">Origen / Red</th>
                <th className="p-8">Monto Principal</th>
                <th className="p-8">Liquidación</th>
                <th className="p-8 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 font-black italic uppercase">
              {ops.map(op => (
                <tr key={op.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors font-black">
                  <td className="p-8">
                    <div className="flex items-center space-x-5">
                       <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg border border-white dark:border-white/5 transform group-hover:rotate-6 transition-transform leading-none text-xs uppercase italic">{op.clienteNombre?.charAt(0)}</div>
                       <div>
                         <p className="text-sm uppercase italic tracking-tighter text-slate-950 dark:text-white mb-1.5 leading-none font-black italic">{op.clienteNombre}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none font-black italic">DNI {op.clienteDni}</p>
                       </div>
                    </div>
                  </td>
                  <td className="p-8 text-center">
                    <div className="flex items-center justify-center text-[10px] uppercase tracking-widest bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10 w-fit mx-auto text-indigo-500 font-black italic">
                      <Zap className="w-3 h-3 mr-2 fill-current" /> {op.entidadNombre}
                    </div>
                  </td>
                  <td className="p-8">
                    <p className="text-xl tracking-tighter italic leading-none mb-2 font-black text-slate-950 dark:text-white italic">${op.monto?.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none italic font-black">Plan {op.cuotas} Meses • {op.sistema}</p>
                  </td>
                  <td className="p-8">
                    <p className="text-xl text-emerald-500 italic tracking-tighter leading-none mb-1.5 font-black italic">${op.valorCuota?.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none italic font-black italic">CFT: {op.cft?.toFixed(1)}%</span>
                  </td>
                  <td className="p-8 text-center">
                    <div className="flex items-center justify-center space-x-2">
                       <button className="bg-slate-100 dark:bg-white/5 p-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all transform group-hover:scale-110 leading-none italic font-black shadow-sm"><ArrowUpRight className="w-4 h-4" /></button>
                       <button className="p-3 text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors leading-none font-black italic"><MoreHorizontal className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && ops.length === 0 && (
          <div className="p-24 text-center font-black italic uppercase">
             <FileText className="w-16 h-16 text-slate-200 dark:text-white/5 mx-auto mb-6" />
             <p className="text-sm tracking-widest text-slate-400 leading-none">Canal sin activos</p>
          </div>
        )}
      </div>
    </div>
  );
}
