'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Layers as LayersIcon, MoreHorizontal, ArrowUpRight, Zap, Search, Filter, Download } from 'lucide-react';

export default function OperacionesPage() {
  const [ops, setOps] = useState<any[]>([]);
  const [filteredOps, setFilteredOps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOps();
  }, []);

  // Lógica de filtrado en tiempo real
  useEffect(() => {
    const results = ops.filter(op => 
      op.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.clienteDni?.includes(searchTerm)
    );
    setFilteredOps(results);
  }, [searchTerm, ops]);

  const fetchOps = async () => {
    try {
      const q = query(collection(db, 'operaciones'), orderBy('fechaCreacion', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOps(data);
      setFilteredOps(data);
    } catch (error) {
      console.error("Error al cargar operaciones:", error);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 italic font-bold">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b dark:border-white/5 pb-8">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[#FF5E14] text-[10px] tracking-[0.5em] uppercase leading-none">
            <LayersIcon className="w-4 h-4 fill-current" /> <span>Core Ledger</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-950 dark:text-white leading-none">Registro Activos</h1>
        </div>
        
        <div className="flex items-center space-x-4">
           <div className="flex items-center bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 px-5 py-3 rounded-2xl shadow-sm text-[12px] w-80 group focus-within:border-orange-500/50 transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-3 group-focus-within:text-[#FF5E14]" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="BUSCAR POR NOMBRE O DNI..." 
                className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white font-bold uppercase tracking-tight" 
              />
           </div>
           <button className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 p-4 rounded-2xl shadow-lg hover:scale-110 transition-all shadow-orange-600/5"><Download className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111111] rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden font-black italic uppercase leading-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-slate-50 dark:bg-white/[0.01] border-b dark:border-white/5 text-slate-400 font-black italic uppercase tracking-widest">
              <tr>
                <th className="px-8 py-6">Identidad Cliente</th>
                <th className="px-8 py-6">Monto Capital</th>
                <th className="px-8 py-6 text-center">Estado Core</th>
                <th className="px-8 py-6 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 font-black italic">
              {filteredOps.map(op => (
                <tr key={op.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors leading-none">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 bg-[#FF5E14] rounded-xl flex items-center justify-center text-white text-xs font-black italic shadow-lg shadow-orange-600/20 group-hover:rotate-6 transition-transform">{op.clienteNombre?.charAt(0)}</div>
                       <div>
                         <p className="text-[13px] font-black italic leading-none mb-1.5 text-slate-900 dark:text-white">{op.clienteNombre}</p>
                         <p className="text-[9px] text-slate-400 tracking-widest leading-none font-bold">DNI {op.clienteDni}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-black text-slate-900 dark:text-white">
                    <p className="text-lg tracking-tighter leading-none mb-1.5">${op.monto?.toLocaleString()}</p>
                    <div className="flex items-center text-[9px] tracking-widest text-[#FF5E14] opacity-80 uppercase italic">
                      <Zap className="w-3 h-3 mr-1.5 fill-current" /> {op.cuotas} Meses • {op.sistema || 'FRANCES'}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="bg-orange-600/10 text-[#FF5E14] px-4 py-2 rounded-xl text-[9px] font-black tracking-widest border border-orange-600/20 italic shadow-sm uppercase">{op.estado}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center space-x-2">
                       <button className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl hover:bg-[#FF5E14] hover:text-white transition-all transform group-hover:scale-110 shadow-sm text-slate-400"><ArrowUpRight className="w-4 h-4" /></button>
                       <button className="p-3 text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredOps.length === 0 && !loading && (
          <div className="py-24 text-center space-y-4">
             <Search className="w-12 h-12 text-slate-200 dark:text-white/5 mx-auto opacity-20" />
             <p className="text-xs text-slate-400 font-bold tracking-[0.5em] uppercase italic">Sin resultados para la búsqueda</p>
          </div>
        )}
      </div>
    </div>
  );
}
