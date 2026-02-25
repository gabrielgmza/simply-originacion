"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { LogOut, Building2, Users, LayoutDashboard, Settings, FileText } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userData, entidadData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !userData) {
      router.push("/login");
    }
  }, [userData, loading, router]);

  if (loading || !userData) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#FF5E14]">Cargando interfaz...</div>;
  }

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const nombreFantasia = entidadData?.nombreFantasia || "Simply Core";

  const cerrarSesion = () => {
    auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-[#050505] text-[#F8F9FA] font-sans overflow-hidden">
      <aside className="w-64 bg-[#0A0A0A] border-r border-gray-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg mr-3 flex items-center justify-center text-white font-bold" style={{ backgroundColor: colorPrimario }}>
            {nombreFantasia.charAt(0)}
          </div>
          <span className="font-bold text-lg truncate">{nombreFantasia}</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {userData.rol.includes("GERENTE") && (
            <>
              <button onClick={() => router.push("/dashboard/gerencia")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${pathname === '/dashboard/gerencia' ? 'bg-gray-900 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'}`}>
                <LayoutDashboard size={18} style={{ color: pathname === '/dashboard/gerencia' ? colorPrimario : undefined }} />
                Panel Gerencial
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors text-gray-400 hover:bg-gray-900/50 hover:text-white">
                <Users size={18} />
                Equipo y Roles
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors text-gray-400 hover:bg-gray-900/50 hover:text-white">
                <Settings size={18} />
                Reglas y Tasas
              </button>
            </>
          )}
          
          <div className="pt-4 mt-4 border-t border-gray-800">
            <p className="px-4 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Operaciones</p>
            <button onClick={() => router.push("/dashboard/originacion")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${pathname === '/dashboard/originacion' ? 'bg-gray-900 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'}`}>
              <FileText size={18} />
              Originador
            </button>
            <button onClick={() => router.push("/dashboard/operaciones")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${pathname === '/dashboard/operaciones' ? 'bg-gray-900 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'}`}>
              <Building2 size={18} />
              Cartera Activa
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="px-4 py-2 mb-2 bg-[#111] rounded-lg">
            <p className="text-xs text-gray-400 truncate">{userData.email}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: colorPrimario }}>{userData.rol.replace("_", " ")}</p>
          </div>
          <button onClick={cerrarSesion} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
