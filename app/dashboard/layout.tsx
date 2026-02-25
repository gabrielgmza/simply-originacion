"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { LogOut, Building2, Users, LayoutDashboard, Settings, FileText, Loader2, AlertCircle, FileSignature, Key } from "lucide-react";
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

  const forzarCierreSesion = () => {
    auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#FF5E14]">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-gray-400">Cargando interfaz...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <p className="mb-6 text-gray-400">Sesion invalida o perfil no encontrado.</p>
        <button onClick={forzarCierreSesion} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-bold">
          Forzar Cierre de Sesion
        </button>
      </div>
    );
  }

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const nombreFantasia = entidadData?.nombreFantasia || "Simply Core";

  return (
    <div className="flex h-screen bg-[#050505] text-[#F8F9FA] font-sans overflow-hidden">
      <aside className="w-64 bg-[#0A0A0A] border-r border-gray-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg mr-3 flex items-center justify-center text-white font-bold" style={{ backgroundColor: colorPrimario }}>
            {nombreFantasia.charAt(0)}
          </div>
          <span className="font-bold text-lg truncate">{nombreFantasia}</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {userData.rol.includes("GERENTE") && (
            <>
              <p className="px-4 text-xs font-semibold text-gray-500 mb-2 mt-2 uppercase tracking-wider">Administracion</p>
              
              <button onClick={() => router.push("/dashboard/gerencia")} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${pathname === '/dashboard/gerencia' ? 'bg-gray-900 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'}`}>
                <LayoutDashboard size={18} style={{ color: pathname === '/dashboard/gerencia' ? colorPrimario : undefined }} />
                Panel Gerencial
              </button>
              
              <button onClick={() => router.push("/dashboard/equipo")} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${pathname === '/dashboard/equipo' ? 'bg-gray-900 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'}`}>
                <Users size={18} style={{ color: pathname === '/dashboard/equipo' ? colorPrimario : undefined }} />
                Equipo y Roles
              </button>
              
              <button onClick={() => router.push("/dashboard/configuracion")} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${pathname === '/dashboard/configuracion' ? 'bg-gray-900 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'}`}>
                <Settings size={18} style={{ color: pathname === '/dashboard/configuracion' ? colorPrimario : undefined }} />
                Reglas y Tasas
              </button>
              
              <button onClick={() => router.push("/dashboard/plantillas")} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${pathname === '/dashboard/plantillas' ? 'bg-gray-900 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'}`}>
                <FileSignature size={18} style={{ color: pathname === '/dashboard/plantillas' ? colorPrimario : undefined }} />
                Plantillas Legales
              </button>

              <button onClick={() => router.push("/dashboard/credenciales")} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${pathname === '/dashboard/credenciales' ? 'bg-gray-900 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'}`}>
                <Key size={18} style={{ color: pathname === '/dashboard/credenciales' ? colorPrimario : undefined }} />
                Credenciales CUAD
              </button>
            </>
          )}
          
          <div className="pt-4 mt-2 border-t border-gray-800">
            <p className="px-4 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Operaciones</p>
            <button onClick={() => router.push("/dashboard/originacion")} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${pathname === '/dashboard/originacion' ? 'bg-gray-900 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'}`}>
              <FileText size={18} style={{ color: pathname === '/dashboard/originacion' ? colorPrimario : undefined }} />
              Originador
            </button>
            <button onClick={() => router.push("/dashboard/operaciones")} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${pathname === '/dashboard/operaciones' ? 'bg-gray-900 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'}`}>
              <Building2 size={18} style={{ color: pathname === '/dashboard/operaciones' ? colorPrimario : undefined }} />
              Cartera Activa
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="px-4 py-2 mb-2 bg-[#111] rounded-lg">
            <p className="text-xs text-gray-400 truncate">{userData.email}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: colorPrimario }}>{userData.rol.replace("_", " ")}</p>
          </div>
          <button onClick={forzarCierreSesion} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
            <LogOut size={16} /> Cerrar Sesion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
