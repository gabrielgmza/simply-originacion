'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Layers as LayersIcon, MoreHorizontal, ArrowUpRight, Zap, Search, Filter } from 'lucide-react';

export default function OperacionesPage() {
  const [ops, setOps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOps(); }, []);

  const fetchOps = async () => {
    try {
      const q = query(collection(db, 'operaciones'), orderBy('fechaCreacion', 'desc'));
      const snap = await getDocs(q);
      setOps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 font-bold italic uppercase">
      <div className="flex items-end justify-between border-b dark:border-white/5 pb-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-indigo-500 text-[10px] tracking-[0.4em] italic uppercase leading-none">
            <LayersIcon className="w-3.5 h-3.5 fill-current" /> <span>Registry</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-white leading-none italic uppercase">Activos</h1>
        </div>
        <div className="flex items-center space-x-4">
           <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 px-4 py-2 rounded-xl shadow-sm text-[11px]">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input placeholder="Filtrar..." className="bg-transparent border-none outline-none italic leading-none" />
           </div>
           <button className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 p-2.5 rounded-xl shadow-lg hover:scale-110 transition-all"><Filter className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0b1224] rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-bold italic uppercase text-[10px]">
            <thead className="bg-slate-50 dark:bg-white/[0.01] border-b dark:border-white/5">
              <tr className="text-slate-400 italic">
                <th className="px-6 py-4">Identidad Cliente</th>
                <th className="px-6 py-4">Origen / Red</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Liquidación</th>
                <th className="px-6 py-4 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5">
              {ops.map(op => (
                <tr key={op.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                       <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-[11px] font-black italic shadow-lg shadow-indigo-500/20 transform group-hover:rotate-6 transition-transform leading-none">{op.clienteNombre?.charAt(0)}</div>
                       <div>
                         <p className="text-[11px] font-black italic leading-none mb-1.5 text-slate-900 dark:text-white">{op.clienteNombre}</p>
                         <p className="text-[9px] text-slate-400 font-bold tracking-widest leading-none">DNI {op.clienteDni}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-[9px] font-black tracking-widest bg-indigo-500/5 text-indigo-500 px-3 py-1.5 rounded-lg border border-indigo-500/10 italic">
                      <Zap className="w-3 h-3 mr-2 fill-current" /> {op.entidadNombre}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black italic tracking-tighter leading-none mb-1.5 text-slate-950 dark:text-white">${op.monto?.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold tracking-widest leading-none">{op.cuotas} Meses • {op.sistema}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-emerald-500 italic leading-none mb-1.5">${op.valorCuota?.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none italic">CFT: {op.cft?.toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                       <button className="bg-slate-100 dark:bg-white/5 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all transform group-hover:scale-110 shadow-sm leading-none italic font-black shadow-sm"><ArrowUpRight className="w-3.5 h-3.5" /></button>
                       <button className="p-2 text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors leading-none italic font-black italic leading-none"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && ops.length === 0 && (
          <div className="py-20 text-center space-y-4 font-black italic uppercase leading-none">
             <Zap className="w-10 h-10 text-slate-200 dark:text-white/5 mx-auto opacity-20 italic leading-none" />
             <p className="text-[10px] text-slate-400 font-bold tracking-[0.5em] leading-none">Sin registros activos</p>
          </div>
        )}
      </div>
    </div>
  );
}
