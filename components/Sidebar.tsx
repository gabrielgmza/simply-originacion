"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardCheck, Landmark, Palette, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  
  const links = [
    { name: "Panel Gerencial", href: "/dashboard/gerencia", icon: LayoutDashboard },
    { name: "Originador", href: "/dashboard/originador", icon: ClipboardCheck },
    { name: "Cartera Activa", href: "/dashboard/cartera", icon: Landmark },
    { name: "Configuración", href: "/dashboard/configuracion/marca", icon: Palette },
  ];

  return (
    <div className="w-64 bg-[#050505] border-r border-gray-900 h-screen flex flex-col p-4 fixed left-0 top-0 z-50">
      <div className="mb-8 px-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center font-bold text-white italic text-xs">V3</div>
        <h2 className="text-white font-black text-xl tracking-tighter">SIMPLY CORE</h2>
      </div>
      <nav className="flex-1 space-y-1">
        {links.map((link) => (
          <Link 
            key={link.name} 
            href={link.href} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${pathname === link.href ? 'bg-white/10 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <link.icon size={18} /> {link.name}
          </Link>
        ))}
      </nav>
      <div className="pt-4 border-t border-gray-900">
        <button className="flex items-center gap-3 px-4 py-3 text-red-500 text-sm hover:bg-red-500/10 w-full rounded-xl transition-all font-bold">
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
