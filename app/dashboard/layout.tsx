'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { 
  LayoutDashboard, 
  Zap, 
  Layers as LayersIcon, 
  Globe, 
  User as UserIcon, 
  LogOut, 
  Sun, 
  Moon, 
  Bell, 
  Search,
  ChevronRight
} from 'lucide-react';

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
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Originación', path: '/dashboard/originacion', icon: Zap },
    { name: 'Operaciones', path: '/dashboard/operaciones', icon: LayersIcon },
    { name: 'Financieras', path: '/dashboard/entidades', icon: Globe },
    { name: 'Perfil', path: '/dashboard/configuracion', icon: UserIcon },
  ];

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-500 font-sans">
        
        {/* SIDEBAR REFINADO */}
        <aside className="w-64 bg-white dark:bg-[#0b1224] border-r border-slate-200/60 dark:border-white/5 flex flex-col z-50">
          <div className="p-6 flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <span className="text-sm font-bold italic">S</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase italic leading-none">Simply</h1>
              <span className="text-[8px] uppercase tracking-widest font-semibold text-indigo-500/80 leading-none text-black dark:text-white">Fintech Core</span>
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1 mt-4 text-black dark:text-white">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <Link key={item.path} href={item.path}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 group ${
                    active 
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' 
                      : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-4 h-4 mr-3 transition-transform ${active ? 'scale-110' : ''}`} />
                    <span className="text-[12px] tracking-tight">{item.name}</span>
                  </div>
                  {active && <ChevronRight className="w-3 h-3 opacity-40" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 mt-auto border-t border-slate-100 dark:border-white/5 space-y-2">
            <button onClick={toggleTheme} className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/5 transition-all text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center space-x-2">
                {isDark ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                <span>{isDark ? 'Noche' : 'Día'}</span>
              </div>
              <div className={`w-7 h-3.5 rounded-full relative transition-colors ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-all ${isDark ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </button>
            
            <button onClick={() => signOut(auth)} className="w-full flex items-center px-4 py-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all italic">
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Salir
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-16 flex items-center justify-between px-8 bg-white/50 dark:bg-[#020617]/50 backdrop-blur-xl z-40 border-b border-slate-200/60 dark:border-white/5">
            <div className="flex items-center bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl w-80 border border-transparent focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all text-black dark:text-white">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-3" />
              <input placeholder="Buscar activos..." className="bg-transparent border-none outline-none text-[11px] w-full font-medium" />
            </div>
            
            <div className="flex items-center space-x-4 pl-4 text-right">
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold italic uppercase leading-none mb-1">{userEmail.split('@')[0]}</p>
                <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest leading-none">Master Admin</p>
              </div>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg shadow-lg flex items-center justify-center text-white font-black text-[10px] italic">
                {userEmail.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar animate-in fade-in duration-700">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
