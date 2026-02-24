'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';
import { 
  LayoutDashboard, 
  Zap, 
  Layers, 
  Globe, 
  User, 
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
    { name: 'Operaciones', path: '/dashboard/operaciones', icon: Layers },
    { name: 'Financieras', path: '/dashboard/entidades', icon: Globe },
    { name: 'Perfil', path: '/dashboard/configuracion', icon: User },
  ];

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen bg-[#fcfdfe] dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-700 font-sans selection:bg-indigo-500/30">
        
        {/* SIDEBAR FLOTANTE GLASSMISM */}
        <aside className="w-72 m-4 mr-0 bg-white/70 dark:bg-[#0b1224]/70 backdrop-blur-2xl border border-slate-200/60 dark:border-white/5 flex flex-col z-50 rounded-[2.5rem] shadow-2xl shadow-indigo-500/5">
          <div className="p-8 flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 group-hover:rotate-12 transition-all duration-500">
              <span className="text-xl font-black italic tracking-tighter">S</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter leading-none italic uppercase italic">Simply</h1>
              <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-indigo-500/80">Private Banking</span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <Link key={item.path} href={item.path}
                  className={`flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-500 group ${
                    active 
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                      : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-5 h-5 mr-4 transition-transform duration-500 ${active ? 'scale-110' : 'group-hover:translate-x-1'}`} />
                    <span className={`text-[13px] tracking-tight ${active ? 'font-bold' : 'font-semibold'}`}>{item.name}</span>
                  </div>
                  {active && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-6 mt-auto space-y-4">
            <button onClick={toggleTheme} className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/5 transition-all hover:scale-[1.02] active:scale-95">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg bg-white dark:bg-[#0b1224] shadow-sm">
                  {isDark ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${isDark ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </button>
            
            <button onClick={() => signOut(auth)} className="w-full flex items-center px-5 py-3 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all group">
              <LogOut className="w-4 h-4 mr-3 group-hover:-translate-x-1 transition-transform" />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-24 flex items-center justify-between px-12 bg-transparent z-40">
            <div className="flex items-center bg-white/40 dark:bg-white/[0.03] backdrop-blur-md px-6 py-3 rounded-2xl w-96 border border-slate-200/40 dark:border-white/5 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-4" />
              <input placeholder="Buscar..." className="bg-transparent border-none outline-none text-xs w-full font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600" />
            </div>
            
            <div className="flex items-center space-x-8">
              <div className="relative cursor-pointer hover:scale-110 transition-transform">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-[#fcfdfe] dark:border-[#020617]"></span>
              </div>
              <div className="h-10 w-[1px] bg-slate-200 dark:bg-white/5"></div>
              <div className="flex items-center space-x-4 pl-2 group cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] font-black tracking-tight italic uppercase text-slate-900 dark:text-white leading-none mb-1">{userEmail.split('@')[0]}</p>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest leading-none">Master Admin</p>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-2xl border-2 border-white dark:border-indigo-900 shadow-xl flex items-center justify-center text-white font-black text-xs italic transform group-hover:rotate-6 transition-all">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-12 pb-12 custom-scrollbar animate-in fade-in duration-1000">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
