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
  Settings,
  Menu,
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
      <div className="flex h-screen bg-[#F4F7FE] dark:bg-[#000000] text-slate-800 dark:text-slate-200 transition-colors duration-300 font-sans selection:bg-orange-500/30 overflow-hidden">
        
        {/* SIDEBAR UENA STYLE */}
        <aside className="w-72 bg-white dark:bg-[#111111] border-r border-slate-100 dark:border-white/5 flex flex-col z-50 shadow-2xl transition-all duration-500">
          <div className="p-8 flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#FF5E14] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
              <span className="text-xl font-bold italic">U</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none italic">UENA</h1>
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#FF5E14] opacity-80">Core Dashboard</span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <Link key={item.path} href={item.path}
                  className={`flex items-center space-x-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
                    active 
                      ? 'bg-[#FF5E14] text-white shadow-lg shadow-orange-600/25 translate-x-1 font-bold' 
                      : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="text-[13px] tracking-tight">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-6 mt-auto border-t border-slate-50 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl">
               <button onClick={() => isDark && toggleTheme()} className={`flex-1 flex justify-center py-2 rounded-xl transition-all ${!isDark ? 'bg-white shadow-md text-[#FF5E14]' : 'text-slate-500 hover:text-white'}`}>
                 <Sun className="w-4 h-4" />
               </button>
               <button onClick={() => !isDark && toggleTheme()} className={`flex-1 flex justify-center py-2 rounded-xl transition-all ${isDark ? 'bg-[#111111] shadow-md text-orange-500' : 'text-slate-500 hover:text-white'}`}>
                 <Moon className="w-4 h-4" />
               </button>
            </div>
            
            <button onClick={() => signOut(auth)} className="w-full flex items-center px-4 py-2.5 text-[11px] font-bold text-rose-500 uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all italic leading-none">
              <LogOut className="w-4 h-4 mr-3" /> Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-20 flex items-center justify-between px-10 bg-white/70 dark:bg-[#111111]/70 backdrop-blur-md z-40 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center bg-slate-100 dark:bg-white/5 px-5 py-2.5 rounded-2xl w-96 border border-transparent focus-within:ring-2 focus-within:ring-orange-500/20 transition-all text-black dark:text-white font-medium">
               <Search className="w-4 h-4 text-slate-400 mr-3" />
               <input placeholder="Filtrar datos del sistema..." className="bg-transparent border-none outline-none text-[12px] w-full" />
            </div>
            
            <div className="flex items-center space-x-8">
              <div className="relative p-2 text-slate-400 hover:text-[#FF5E14] cursor-pointer transition-all hover:scale-110">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF5E14] rounded-full border-2 border-white dark:border-[#111111]"></span>
              </div>
              <div className="flex items-center space-x-4 pl-4 border-l dark:border-white/10 group cursor-pointer text-right italic font-bold">
                <div className="hidden sm:block">
                  <p className="text-[12px] uppercase leading-none mb-1 text-slate-900 dark:text-white">{userEmail.split('@')[0]}</p>
                  <p className="text-[9px] text-[#FF5E14] uppercase tracking-widest leading-none">Master Admin</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-tr from-[#FF5E14] to-orange-400 rounded-xl shadow-lg flex items-center justify-center text-white font-black text-xs transform group-hover:rotate-6 transition-all uppercase">
                  {userEmail.charAt(0)}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar animate-in fade-in duration-1000">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
