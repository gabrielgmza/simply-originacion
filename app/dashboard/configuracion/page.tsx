'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[100] p-5 rounded-3xl shadow-2xl border-4 ${type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-rose-600 border-rose-400'} text-white font-black text-xs uppercase tracking-widest animate-in slide-in-from-top-4`}>
      {message}
    </div>
  );
};

export default function ConfiguracionPage() {
  const [user, setUser] = useState<any>(null);
  const [newPass, setNewPass] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleUpdatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) return setToast({message: "MÍNIMO 6 CARACTERES", type: "error"});
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPass);
        setToast({message: "CONTRASEÑA ACTUALIZADA", type: "success"});
        setNewPass('');
      }
    } catch (e) { setToast({message: "RE-AUTENTICACIÓN REQUERIDA", type: "error"}); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 p-6 font-black min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="space-y-2 border-b-8 border-slate-200 pb-8">
        <h1 className="text-6xl font-black text-slate-950 uppercase italic tracking-tighter">Mi Perfil Simply</h1>
        <p className="text-blue-600 uppercase tracking-[0.4em] text-xs">Gestión de Acceso y Personalización</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* TARJETA DE IDENTIDAD */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                 <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div className="h-24 w-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-xl ring-4 ring-white/10">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl uppercase italic tracking-tighter truncate">{user?.email?.split('@')[0]}</h2>
              <p className="text-[10px] text-blue-400 uppercase tracking-widest mt-2">{user?.email}</p>
              <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                 <div className="flex justify-between text-[10px] uppercase">
                    <span className="opacity-40">Rol de Acceso</span>
                    <span className="text-emerald-400">Master Admin</span>
                 </div>
                 <div className="flex justify-between text-[10px] uppercase">
                    <span className="opacity-40">Estado</span>
                    <span className="text-blue-400 font-black tracking-widest">Activo ✓</span>
                 </div>
              </div>
           </div>
        </div>

        {/* AJUSTES DE SEGURIDAD */}
        <div className="lg:col-span-8">
           <div className="bg-white p-12 rounded-[4rem] border-4 border-slate-800 shadow-2xl space-y-12">
              <div className="space-y-4">
                <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.5em] border-b-8 border-slate-50 pb-6 flex justify-between items-center">
                   <span>Seguridad de Cuenta</span>
                   <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </h3>
                <form onSubmit={handleUpdatePass} className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest ml-8">Nueva Contraseña</label>
                    <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full p-6 bg-slate-100 border-4 border-slate-400 rounded-[2rem] font-black text-2xl text-slate-950 focus:border-blue-600 focus:bg-white transition-all shadow-inner outline-none" placeholder="••••••••" />
                  </div>
                  <button type="submit" className="bg-slate-950 text-white px-20 py-8 rounded-[3rem] font-black uppercase tracking-[0.5em] text-xl hover:bg-black transition-all shadow-2xl active:scale-95 ring-8 ring-transparent hover:ring-blue-600/10">
                    Cambiar Password
                  </button>
                </form>
              </div>

              <div className="bg-blue-50 p-10 rounded-[3rem] border-4 border-blue-100">
                 <h4 className="text-xl uppercase italic text-blue-900 mb-4 tracking-tighter">Soporte Tecnológico</h4>
                 <p className="text-sm font-bold text-blue-800/60 leading-relaxed mb-6">Si necesitas realizar cambios en la configuración legal de tu entidad o modificar las comisiones de servicio, por favor contacta al departamento de sistemas de Simply.</p>
                 <button className="bg-white border-2 border-blue-200 px-8 py-4 rounded-2xl text-blue-600 uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-md">Abrir Ticket</button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
