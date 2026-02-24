'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { FileText, Search, Filter, MoreHorizontal, ArrowUpRight, Zap, Download } from 'lucide-react';

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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-4 font-black italic uppercase">
          <div className="flex items-center space-x-2 text-indigo-500 text-[10px] tracking-[0.6em] leading-none">
            <Layers className="w-3 h-3 fill-current" /> <span>Master Registry</span>
          </div>
          <h1 className="text-8xl tracking-tighter text-slate-950 dark:text-white leading-none">Activos</h1>
        </div>
        <div className="flex space-x-4">
           <button className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 p-6 rounded-[2rem] shadow-2xl hover:scale-110 transition-all italic font-black uppercase text-[10px] flex items-center">
             <Download className="w-4 h-4 mr-3" /> Exportar Lote
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {ops.map((op) => (
          <div key={op.id} className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white/20 dark:border-white/5 shadow-xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden font-black uppercase italic">
            <div className="absolute top-0 right-0 p-8">
               <ArrowUpRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
            
            <div className="flex items-center space-x-6 mb-10">
               <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-2xl shadow-xl shadow-indigo-500/20">{op.clienteNombre?.charAt(0)}</div>
               <div>
                 <h3 className="text-xl text-slate-950 dark:text-white leading-none tracking-tighter italic">{op.clienteNombre}</h3>
                 <p className="text-[10px] text-slate-400 mt-2 tracking-widest leading-none">DNI {op.clienteDni}</p>
               </div>
            </div>

            <div className="space-y-8">
               <div className="flex justify-between items-end border-b dark:border-white/5 pb-6">
                  <div>
                    <p className="text-[9px] text-indigo-500 mb-1 tracking-[0.3em] leading-none">Monto Principal</p>
                    <p className="text-4xl text-slate-950 dark:text-white leading-none tracking-tighter">${op.monto?.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 mb-1 tracking-[0.2em] leading-none">Plan Cuotas</p>
                    <p className="text-2xl text-slate-900 dark:text-slate-300 leading-none">{op.cuotas}</p>
                  </div>
               </div>

               <div className="flex justify-between items-center bg-slate-100 dark:bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-inner">
                  <div>
                    <p className="text-[9px] text-emerald-500 tracking-widest leading-none mb-1">Liquidación</p>
                    <p className="text-2xl text-emerald-500 tracking-tighter leading-none">${op.valorCuota?.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                  </div>
                  <span className="bg-indigo-500 text-white px-4 py-2 rounded-xl text-[8px] tracking-[0.3em] shadow-lg shadow-indigo-500/20">{op.estado}</span>
               </div>
            </div>
          </div>
        ))}

        {!loading && ops.length === 0 && (
          <div className="col-span-full py-40 text-center space-y-6">
             <div className="w-32 h-32 bg-slate-200 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto opacity-20"><Zap className="w-16 h-16 text-slate-500" /></div>
             <p className="text-slate-400 font-black italic tracking-[0.5em] text-sm uppercase">Sin activos registrados en el Core</p>
          </div>
        )}
      </div>
    </div>
  );
}
