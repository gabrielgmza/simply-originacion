'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Zap, TrendingUp, Clock, CheckCircle, ArrowRight, Wallet, Activity } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const snap = await getDocs(collection(db, 'operaciones'));
        const total = snap.docs.reduce((acc, doc) => acc + (doc.data().monto || 0), 0);
        setStats({
          total,
          pending: snap.docs.filter(d => d.data().estado === 'PENDIENTE_FIRMA').length,
          active: snap.docs.filter(d => d.data().estado === 'LIQUIDADO').length
        });
      } catch (error) {
        console.error("Error en métricas:", error);
      } finally { 
        setLoading(false); 
      }
    };
    fetchStats();
  }, []);

  const Card = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-[#111111] p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5 relative overflow-hidden group transition-all duration-500 hover:shadow-orange-600/5">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color === 'orange' ? '[#FF5E14]' : color}-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/20 transition-all duration-700`}></div>
      <div className="relative z-10 font-bold italic uppercase leading-none">
        <div className={`w-12 h-12 rounded-2xl ${color === 'orange' ? 'bg-orange-500/10 text-[#FF5E14]' : `bg-${color}-500/10 text-${color}-600`} flex items-center justify-center mb-6 shadow-sm`}>
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-3">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 italic uppercase">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b dark:border-white/5 pb-6">
        <div className="space-y-1 font-black leading-none">
          <div className="flex items-center space-x-2 text-[#FF5E14] text-[10px] tracking-[0.5em] italic">
            <Activity className="w-4 h-4" /> <span>Sistema Central de Monitoreo</span>
          </div>
          <h1 className="text-4xl tracking-tighter text-slate-900 dark:text-white leading-none italic uppercase">Visión de Mercado</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card title="Volumen en Cartera" value={`$${stats.total.toLocaleString()}`} icon={Wallet} color="orange" />
        <Card title="Esperando Firma" value={stats.pending} icon={Clock} color="indigo" />
        <Card title="Activos Liquidados" value={stats.active} icon={CheckCircle} color="emerald" />
        <Card title="Yield Mensual" value="+12.5%" icon={TrendingUp} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white dark:bg-[#111111] p-10 rounded-[3rem] shadow-xl border border-slate-100 dark:border-white/5 font-black italic">
          <div className="flex items-center justify-between mb-10">
             <h3 className="text-xl text-slate-900 dark:text-white tracking-tighter uppercase italic font-black">Historial del Core</h3>
             <button className="text-[10px] text-[#FF5E14] tracking-widest font-black flex items-center hover:translate-x-1 transition-transform">EXPLORAR REGISTRO <ArrowRight className="w-4 h-4 ml-2" /></button>
          </div>
          <div className="space-y-6 opacity-30 pointer-events-none italic">
             {[1,2,3].map(i => (
               <div key={i} className="h-16 bg-slate-50 dark:bg-white/5 rounded-2xl animate-pulse flex items-center px-6 border dark:border-white/5">
                 <div className="w-1/4 h-3 bg-slate-200 dark:bg-white/10 rounded"></div>
                 <div className="ml-auto w-1/6 h-3 bg-slate-200 dark:bg-white/10 rounded"></div>
               </div>
             ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#FF5E14] p-10 rounded-[3rem] text-white shadow-[0_40px_80px_-15px_rgba(255,94,20,0.4)] relative overflow-hidden flex flex-col justify-between italic font-black group transition-all duration-500 hover:scale-[1.02]">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-125"></div>
           <Zap className="w-12 h-12 mb-10 text-white/50 animate-pulse" />
           <div>
              <h4 className="text-3xl tracking-tighter leading-tight mb-4 italic font-black uppercase">Nueva Originación</h4>
              <p className="text-orange-50 text-[11px] font-medium leading-relaxed opacity-90 mb-10 uppercase italic font-bold">Activa el motor de scoring y genera contratos digitales en tiempo récord.</p>
              <button className="w-full bg-white text-[#FF5E14] py-5 rounded-2xl text-[11px] tracking-widest hover:bg-orange-50 transition-all uppercase italic font-black shadow-xl">Iniciar Engine</button>
           </div>
        </div>
      </div>
    </div>
  );
}
