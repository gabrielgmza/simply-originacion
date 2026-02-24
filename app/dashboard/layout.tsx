'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
// Ruta relativa ajustada para estructura src/lib
import { auth } from '../../lib/firebase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/login');
      else setUserEmail(user.email || '');
    });
    const saved = localStorage.getItem('simply-theme');
    if (saved === 'dark') setIsDark(true);
    return () => unsubscribe();
  }, [router]);

  const toggleTheme = () => {
    const newVal = !isDark;
    setIsDark(newVal);
    localStorage.setItem('simply-theme', newVal ? 'dark' : 'light');
  };

  if (!mounted) return null;

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Originación', path: '/dashboard/originacion' },
    { name: 'Operaciones', path: '/dashboard/operaciones' },
    { name: 'Financieras', path: '/dashboard/entidades' },
    { name: 'Mi Perfil', path: '/dashboard/configuracion' },
  ];

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen bg-[#fcfdfe] dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-700 font-sans selection:bg-indigo-500/30">
        
        {/* SIDEBAR ELITE GLASS */}
        <aside className="w-72 m-4 mr-0 bg-white/80 dark:bg-[#0b1224]/80 backdrop-blur-2xl border border-slate-200/60 dark:border-white/5 flex flex-col z-50 rounded-[2.5rem] shadow-2xl">
          <div className="p-10">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 group-hover:rotate-12 transition-all">
                <span className="text-xl font-black italic">S</span>
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tighter leading-none italic uppercase">Simply</h1>
                <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-indigo-500/80">Private Core</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-6 space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <Link key={item.path} href={item.path}
                  className={`flex items-center justify-between px-5 py-4 rounded-[1.2rem] transition-all duration-500 group ${
                    active 
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/25' 
                      : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <span className={`text-[13px] tracking-tight ${active ? 'font-bold italic' : 'font-semibold uppercase tracking-widest text-[10px]'}`}>
                    {item.name}
                  </span>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>}
                </Link>
              );
            })}
          </nav>

          <div className="p-8 space-y-4">
            <button onClick={toggleTheme} className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/5 transition-all">
              <span className="text-[10px] font-black uppercase tracking-widest ml-2">{isDark ? 'Dark' : 'Light'}</span>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isDark ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </button>
            <button onClick={() => signOut(auth)} className="w-full text-center py-2 text-[10px] font-black text-rose-500 uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
              Finalizar Sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-24 flex items-center justify-between px-12 z-40 border-b border-slate-100 dark:border-white/5 bg-white/20 dark:bg-transparent backdrop-blur-md">
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.5em]">Simply Ecosistema v4.0</div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-[11px] font-black tracking-tight italic uppercase">{userEmail.split('@')[0]}</p>
                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Master Admin</p>
              </div>
              <div className="w-11 h-11 bg-indigo-600 rounded-2xl border-2 border-white dark:border-indigo-900 shadow-xl flex items-center justify-center text-white font-black text-xs italic">
                {userEmail.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-12 py-12 animate-in fade-in duration-1000">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
