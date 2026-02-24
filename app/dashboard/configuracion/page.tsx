'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { Settings, Shield, User as UserIcon, Bell, Key, Globe } from 'lucide-react';

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const Option = ({ icon: Icon, title, desc }: any) => (
    <div className="flex items-center justify-between p-6 bg-white dark:bg-[#111111] rounded-[2rem] border border-slate-100 dark:border-white/5 hover:border-[#FF5E14] transition-all cursor-pointer group shadow-sm italic font-bold uppercase leading-none">
      <div className="flex items-center space-x-5">
        <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#FF5E14] transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[13px] text-slate-900 dark:text-white uppercase leading-none mb-1.5 font-black">{title}</p>
          <p className="text-[10px] text-slate-400 tracking-widest leading-none italic font-bold uppercase">{desc}</p>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
         <Settings className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-1000 italic font-bold uppercase leading-none">
      <header className="border-b dark:border-white/5 pb-6 leading-none italic font-bold uppercase">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white italic uppercase leading-none">Perfil de Operador</h1>
        <p className="text-[11px] font-bold text-slate-400 tracking-[0.4em] uppercase mt-2 italic">Ajustes de Privacidad y Seguridad Master</p>
      </header>

      <div className="flex items-center space-x-8 bg-white dark:bg-[#111111] p-10 rounded-[3rem] shadow-xl border border-slate-100 dark:border-white/5 leading-none italic font-bold uppercase group transition-all duration-500 hover:shadow-orange-600/5">
         <div className="w-24 h-24 bg-gradient-to-tr from-[#FF5E14] to-orange-400 rounded-3xl shadow-2xl flex items-center justify-center text-white font-black text-4xl transform -rotate-2 group-hover:rotate-0 transition-transform duration-500 italic shadow-orange-600/20">
            {user?.email?.charAt(0).toUpperCase()}
         </div>
         <div className="italic font-bold uppercase leading-none">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none italic font-black uppercase">{user?.email?.split('@')[0]}</h2>
            <p className="text-[10px] text-[#FF5E14] tracking-widest mt-2 font-black italic font-bold uppercase opacity-80">{user?.email}</p>
            <div className="mt-4 flex space-x-2">
               <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg text-[9px] tracking-widest font-black uppercase italic border border-emerald-500/20 shadow-sm">ESTADO: CONECTADO</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-none italic font-bold uppercase">
        <Option icon={Shield} title="Seguridad" desc="Autenticación 2FA y Biometría" />
        <Option icon={Bell} title="Alertas" desc="Push de Originación y BCRA" />
        <Option icon={Key} title="Llaves" desc="Acceso a llaves API de Fondeo" />
        <Option icon={Globe} title="Regional" desc="Zona Horaria Mendoza, AR" />
      </div>
    </div>
  );
}
