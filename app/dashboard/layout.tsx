'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Building2, 
  UserCircle, 
  LogOut, 
  Sun, 
  Moon, 
  Bell,
  Search,
  ChevronRight
} from 'lucide-react';

const ThemeContext = createContext({ isDark: false, toggle: () => {} });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push('/login');
      else setUser(u);
    });
    const saved = localStorage.getItem('simply-theme');
    if (saved === 'dark') setIsDark(true);
    return () => unsub();
  }, [router]);

  const toggleTheme = () => {
    const newVal = !isDark;
    setIsDark(newVal);
    localStorage.setItem('simply-theme', newVal ? 'dark' : 'light');
  };

  if (!mounted) return null;

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Nueva Originación', path: '/dashboard/originacion', icon: PlusCircle },
    { name: 'Operaciones', path: '/dashboard/operaciones', icon: FileText },
    { name: 'Entidades', path: '/dashboard/entidades', icon: Building2 },
    { name: 'Mi Cuenta', path: '/dashboard/configuracion', icon: UserCircle },
  ];

  return (
    <ThemeContext.Provider value={{ isDark, toggle: toggleTheme }}>
      <div className={`${isDark ? 'dark' : ''} selection:bg-indigo-500/30`}>
        <div className="flex h-screen bg-[#fcfdfe] dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-500 font-sans">
          
          {/* SIDEBAR MINIMALISTA */}
          <aside className="w-72 bg-white dark:bg-[#0b0f1a] border-r border-slate-200/60 dark:border-white/5 flex flex-col z-50">
            <div className="p-8 mb-4">
              <div className="flex items-center space-x-3 group cursor-pointer">
                <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-xl font-bold italic">S</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight leading-none">Simply</h1>
                  <span className="text-[10px] uppercase tracking-[0.3em] font-black text-indigo-500">Bancaria</span>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 space-y-1.5">
              {navItems.map((item) => {
                const active = pathname === item.path;
                return (
                  <Link key={item.path} href={item.path}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group ${
                      active 
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:translate-x-1'}`} />
                      <span className="text-[13px] font-semibold">{item.name}</span>
                    </div>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"></div>}
                  </Link>
                );
              })}
            </nav>

            <div className="p-6 mt-auto border-t border-slate-100 dark:border-white/5 space-y-4">
              <button onClick={toggleTheme} className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:opacity-80 transition-all">
                <div className="flex items-center space-x-3">
                  {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span className="text-[11px] font-bold uppercase tracking-widest">{isDark ? 'Modo Noche' : 'Modo Día'}</span>
                </div>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isDark ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </button>
              
              <button onClick={() => signOut(auth)} className="w-full flex items-center px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all group">
                <LogOut className="w-4 h-4 mr-3 group-hover:-translate-x-1 transition-transform" />
                Salir del Sistema
              </button>
            </div>
          </aside>

          {/* CONTENIDO PRINCIPAL */}
          <main className="flex-1 flex flex-col relative overflow-hidden">
            {/* TOP BAR */}
            <header className="h-20 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between px-10 bg-white/50 dark:bg-[#020617]/50 backdrop-blur-md z-40">
              <div className="flex items-center bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-2xl w-96 border border-transparent focus-within:border-indigo-500/50 transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-3" />
                <input placeholder="Buscar operación, DNI o cliente..." className="bg-transparent border-none outline-none text-xs w-full font-medium" />
              </div>
              <div className="flex items-center space-x-6">
                <button className="relative p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#020617]"></span>
                </button>
                <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10"></div>
                <div className="flex items-center space-x-3 pl-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-[11px] font-bold tracking-tight">{user?.email?.split('@')[0]}</p>
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Administrador</p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-full border border-white dark:border-white/10 shadow-sm"></div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
