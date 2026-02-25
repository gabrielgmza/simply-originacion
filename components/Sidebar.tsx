"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ShieldCheck, FileText, Landmark, ClipboardCheck, Palette, Database } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const menu = [
    { name: "Dashboard", href: "/dashboard/gerencia", icon: LayoutDashboard },
    { name: "Originador (BCRA)", href: "/dashboard/originador", icon: ClipboardCheck },
    { name: "Cartera Activa", href: "/dashboard/cartera", icon: Landmark },
    { name: "Equipo y Roles", href: "/dashboard/equipo", icon: Users },
    { name: "Plantillas Legales", href: "/dashboard/legal", icon: FileText },
    { name: "Configuración API", href: "/dashboard/configuracion/api", icon: Database },
    { name: "Marca", href: "/dashboard/configuracion/marca", icon: Palette },
  ];

  return (
    <div className="w-64 bg-[#050505] border-r border-gray-900 h-screen flex flex-col p-4 shrink-0">
      <div className="mb-8 px-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#FF5E14] rounded-lg flex items-center justify-center font-bold text-white italic">C</div>
        <h2 className="text-white font-black text-xl tracking-tighter italic">CrediPrueba</h2>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {menu.map((item) => (
          <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${pathname === item.href ? 'bg-white/10 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}>
            <item.icon size={18} /> {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
