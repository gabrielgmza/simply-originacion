"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Users, Settings, FileText, ShieldCheck, 
  Bell, Palette, LogOut, Key, Landmark, ClipboardCheck
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menuAdmin = [
    { name: "Panel Gerencial", href: "/dashboard/gerencia", icon: LayoutDashboard },
    { name: "Equipo y Roles", href: "/dashboard/equipo/roles", icon: Users },
    { name: "Reglas y Tasas", href: "/dashboard/reglas", icon: Settings },
    { name: "Plantillas Legales", href: "/dashboard/plantillas", icon: FileText },
    { name: "Credenciales CUAD", href: "/dashboard/credenciales-cuad", icon: Key },
  ];

  const menuOperaciones = [
    { name: "Originador", href: "/dashboard/originador", icon: ClipboardCheck },
    { name: "Cartera Activa", href: "/dashboard/cartera", icon: Landmark },
  ];

  const menuConfig = [
    { name: "Identidad de Marca", href: "/dashboard/configuracion/marca", icon: Palette },
    { name: "Notificaciones", href: "/dashboard/configuracion/notificaciones", icon: Bell },
    { name: "Mi Perfil", href: "/dashboard/perfil", icon: ShieldCheck },
  ];

  return (
    <div className="w-64 bg-[#050505] border-r border-gray-900 h-screen flex flex-col p-4 fixed left-0 top-0">
      <div className="mb-8 px-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#FF5E14] rounded-lg flex items-center justify-center font-bold text-white italic">C</div>
        <h2 className="text-white font-black text-xl tracking-tighter italic">CrediPrueba</h2>
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto custom-scrollbar">
        <div>
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4 mb-4">Administracion</p>
          {menuAdmin.map((item) => (
            <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${pathname === item.href ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <item.icon size={18} /> {item.name}
            </Link>
          ))}
        </div>

        <div>
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4 mb-4">Operaciones</p>
          {menuOperaciones.map((item) => (
            <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${pathname === item.href ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <item.icon size={18} /> {item.name}
            </Link>
          ))}
        </div>

        <div>
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4 mb-4">Configuracion</p>
          {menuConfig.map((item) => (
            <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${pathname === item.href ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <item.icon size={18} /> {item.name}
            </Link>
          ))}
        </div>
      </nav>

      <div className="pt-4 border-t border-gray-900">
        <button className="flex items-center gap-3 px-4 py-3 text-red-500 text-sm hover:bg-red-500/10 w-full rounded-xl transition-all">
          <LogOut size={18} /> Cerrar Sesion
        </button>
      </div>
    </div>
  );
}
