'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Layers, MoreHorizontal, ArrowUpRight, Zap } from 'lucide-react';

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
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b dark:border-white/5 pb-6">
        <div className="space-y-1 font-bold italic uppercase">
          <div className="flex items-center space-x-2 text-indigo-500 text-[10px] tracking-[0.4em]">
            <Layers className="w-3 h-3 fill-current" /> <span>Registry</span>
          </div>
          <h1 className="text-3xl tracking-tighter text-slate-950 dark:text-white leading-none italic uppercase">Activos</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0b1224] rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden text-black dark:text-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-white/[0.01] border-b dark:border-white/5">
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">
                <th className="px-6 py-4 font-black">Cliente</th>
                <th className="px-6 py-4 font-black">Origen</th>
                <th className="px-6 py-4 font-black">Monto</th>
                <th className="px-6 py-4 font-black">Liquidación</th>
                <th className="px-6 py-4 text-center font-black">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5">
              {ops.map(op => (
                <tr key={op.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                       <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold uppercase italic">{op.clienteNombre?.charAt(0)}</div>
                       <div>
                         <p className="text-xs font-bold uppercase italic leading-none mb-1">{op.clienteNombre}</p>
                         <p className="text-[9px] text-slate-400 font-bold tracking-widest leading-none font-black italic">DNI {op.clienteDni}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-indigo-500/5 text-indigo-500 px-3 py-1 rounded-lg border border-indigo-500/10 italic">
                      {op.entidadNombre}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold leading-none mb-1">${op.monto?.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">{op.cuotas} Meses • {op.sistema}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-emerald-500 italic leading-none mb-1">${op.valorCuota?.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">CFT: {op.cft?.toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-1 opacity-40 group-hover:opacity-100 transition-opacity">
                       <button className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-all"><ArrowUpRight className="w-3.5 h-3.5" /></button>
                       <button className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition-all"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && ops.length === 0 && (
          <div className="py-20 text-center space-y-4 font-black italic uppercase">
             <Zap className="w-8 h-8 text-slate-200 mx-auto opacity-20" />
             <p className="text-[10px] text-slate-400 font-bold tracking-[0.4em]">Sin registros activos</p>
          </div>
        )}
      </div>
    </div>
  );
}
