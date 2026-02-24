'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { 
  LayoutDashboard, Zap, Layers as LayersIcon, Globe, 
  User as UserIcon, LogOut, Sun, Moon, Bell, Search, Settings, ChevronRight
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/login');
      else setUserEmail(user.email || '');
    });
    const saved = localStorage.getItem('simply-theme');
    if (saved) setIsDark(saved === 'dark');
    return () => unsubscribe();
  }, [router]);

  const toggleTheme = () => {
    const newVal = !isDark;
    setIsDark(newVal);
    localStorage.setItem('simply-theme', newVal ? 'dark' : 'light');
  };

  if (!mounted) return null;

  const navItems = [
    { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Originación', path: '/dashboard/originacion', icon: Zap },
    { name: 'Activos', path: '/dashboard/operaciones', icon: LayersIcon },
    { name: 'Nodos', path: '/dashboard/entidades', icon: Globe },
    { name: 'Perfil', path: '/dashboard/configuracion', icon: UserIcon },
  ];

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen bg-slate-50 dark:bg-black text-slate-600 dark:text-slate-400 font-sans selection:bg-orange-500/30">
        
        {/* SIDEBAR COMPACTO */}
        <aside className="w-64 bg-white dark:bg-[#0a0a0a] border-r border-slate-200 dark:border-neutral-800 flex flex-col z-50">
          <div className="p-6 flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <span className="text-sm font-bold">U</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase">UENA CORE</span>
          </div>

          <nav className="flex-1 px-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <Link key={item.path} href={item.path}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${
                    active 
                      ? 'bg-orange-600/10 text-orange-600 dark:text-orange-500' 
                      : 'hover:bg-slate-100 dark:hover:bg-neutral-900 text-slate-500 dark:text-neutral-500'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-4 h-4" />
                    <span className="text-[13px] font-medium">{item.name}</span>
                  </div>
                  {active && <div className="w-1 h-4 bg-orange-600 rounded-full" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-neutral-800 space-y-2">
            <button onClick={toggleTheme} className="w-full flex items-center justify-between p-2 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors">
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase">
                {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                <span>{isDark ? 'Oscuro' : 'Claro'}</span>
              </div>
            </button>
            <button onClick={() => signOut(auth)} className="w-full flex items-center p-2 text-xs font-semibold text-rose-500 uppercase hover:bg-rose-500/5 rounded-md transition-colors leading-none">
              <LogOut className="w-3.5 h-3.5 mr-2" /> Salir
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 flex items-center justify-between px-8 bg-white/50 dark:bg-black/50 backdrop-blur-md border-b border-slate-200 dark:border-neutral-800 z-40">
            <div className="flex items-center bg-slate-100 dark:bg-neutral-900 px-3 py-1.5 rounded-md border border-slate-200 dark:border-neutral-800 w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input placeholder="Buscar..." className="bg-transparent border-none outline-none text-xs w-full" />
            </div>
            
            <div className="flex items-center space-x-4">
              <Bell className="w-4 h-4 cursor-pointer hover:text-orange-500 transition-colors" />
              <div className="h-4 w-px bg-slate-200 dark:border-neutral-800"></div>
              <div className="flex items-center space-x-3 text-right">
                <div className="hidden sm:block leading-none">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{userEmail.split('@')[0]}</p>
                  <p className="text-[10px] text-slate-400 uppercase mt-0.5">Admin</p>
                </div>
                <div className="w-8 h-8 bg-orange-600 rounded-md flex items-center justify-center text-white text-xs font-bold uppercase">
                  {userEmail.charAt(0)}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
