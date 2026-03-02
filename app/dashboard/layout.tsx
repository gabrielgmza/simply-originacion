"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, UserCheck, Briefcase, Users, 
  FileSignature, Webhook, Palette, Menu, X, LogOut 
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const menu = [
    { nombre: "Dashboard", ruta: "/dashboard", icono: <LayoutDashboard size={20} /> },
    { nombre: "Originador (BCRA)", ruta: "/dashboard/originador/legajo", icono: <UserCheck size={20} /> },
    { nombre: "Cartera Activa", ruta: "/dashboard/cartera", icono: <Briefcase size={20} /> },
    { nombre: "Equipo y Roles", ruta: "/dashboard/equipo", icono: <Users size={20} /> },
    { nombre: "Plantillas Legales", ruta: "/dashboard/legal", icono: <FileSignature size={20} /> },
    { nombre: "Configuración API", ruta: "/dashboard/configuracion/api", icono: <Webhook size={20} /> },
    { nombre: "Marca", ruta: "/dashboard/configuracion/marca", icono: <Palette size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans">
      
      {/* HEADER MOBILE (Solo se ve en celulares) */}
      <div className="md:hidden flex items-center justify-between bg-[#0A0A0A] border-b border-gray-800 p-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
           <div className="bg-orange-600 text-white font-black p-1 rounded">C</div>
           <span className="text-white font-black italic text-xl">CrediPrueba</span>
        </div>
        <button onClick={() => setMenuAbierto(!menuAbierto)} className="text-white">
          {menuAbierto ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* SIDEBAR (Menú Lateral) */}
      <aside className={`
        ${menuAbierto ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#0A0A0A] border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out
      `}>
        {/* LOGO (Oculto en celular porque ya está en el header) */}
        <div className="hidden md:flex items-center gap-2 p-6">
           <div className="bg-orange-600 text-white font-black px-2 py-1 rounded">C</div>
           <span className="text-white font-black italic text-2xl">CrediPrueba</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menu.map((item) => {
            const activo = pathname === item.ruta || (item.ruta !== "/dashboard" && pathname.startsWith(item.ruta));
            return (
              <Link 
                key={item.ruta} 
                href={item.ruta}
                onClick={() => setMenuAbierto(false)} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                  activo 
                  ? "bg-gray-800/50 text-white border border-gray-700" 
                  : "text-gray-400 hover:text-white hover:bg-gray-900"
                }`}
              >
                {item.icono}
                {item.nombre}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
           <button className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-950/30 rounded-xl transition-all font-bold text-sm w-full">
             <LogOut size={20}/>
             Cerrar Sesión
           </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {children}
      </main>

      {/* OVERLAY MOBILE (Fondo oscuro cuando el menú está abierto en el celu) */}
      {menuAbierto && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden" 
          onClick={() => setMenuAbierto(false)}
        />
      )}
    </div>
  );
}
