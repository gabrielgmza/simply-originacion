'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
// Importación simplificada para evitar errores de compilación
import { auth } from '../../lib/firebase';
import { 
  LayoutDashboard, 
  Zap, 
  FileText, 
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
    { name: 'Operaciones', path: '/dashboard/operaciones', icon: FileText },
    { name: 'Financieras', path: '/dashboard/entidades', icon: Globe },
    { name: 'Perfil', path: '/dashboard/configuracion', icon: User },
  ];

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen bg-[#fcfdfe] dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-500 font-sans">
        
        <aside className="w-72 bg-white dark:bg-[#0b1224] border-r border-slate-200/60 dark:border-white/5 flex flex-col z-50">
          <div className="p-8 flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 group-hover:rotate-6 transition-transform">
              <span className="text-xl font-black italic">S</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none italic uppercase">Simply</h1>
              <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-indigo-500">Core Engine</span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <Link key={item.path} href={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group ${
                    active 
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-5 h-5 mr-3 transition-transform ${active ? 'scale-110' : 'group-hover:translate-x-1'}`} />
                    <span className="text-[13px] font-bold tracking-tight">{item.name}</span>
                  </div>
                  {active && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-6 mt-auto border-t border-slate-100 dark:border-white/5 space-y-4">
            <button onClick={toggleTheme} className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:opacity-80 transition-all border border-transparent dark:border-white/5">
              <div className="flex items-center space-x-3">
                {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span className="text-[10px] font-black uppercase tracking-widest">{isDark ? 'Dark' : 'Light'}</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isDark ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </button>
            
            <button onClick={() => signOut(auth)} className="w-full flex items-center px-4 py-2 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all">
              <LogOut className="w-4 h-4 mr-3" />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-20 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between px-10 bg-white/50 dark:bg-[#020617]/50 backdrop-blur-xl z-40">
            <div className="flex items-center bg-slate-100 dark:bg-white/5 px-5 py-2.5 rounded-2xl w-96 border border-transparent focus-within:border-indigo-500/30 transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-3" />
              <input placeholder="Buscar..." className="bg-transparent border-none outline-none text-xs w-full font-semibold" />
            </div>
            <div className="flex items-center space-x-6">
              <Bell className="w-5 h-5 text-slate-400 cursor-pointer hover:text-indigo-500 transition-colors" />
              <div className="flex items-center space-x-3 pl-4 border-l dark:border-white/10 text-right">
                <div className="hidden sm:block text-slate-900 dark:text-white">
                  <p className="text-[11px] font-black tracking-tight italic uppercase">{userEmail.split('@')[0]}</p>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-1">Master Admin</p>
                </div>
                <div className="w-10 h-10 bg-indigo-600 rounded-full border-2 border-white dark:border-indigo-500 flex items-center justify-center text-white font-black text-xs italic">{userEmail.charAt(0).toUpperCase()}</div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar animate-in fade-in duration-700">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
