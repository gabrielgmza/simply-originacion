"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Users, Settings, FileText, ShieldCheck, 
  Bell, Palette, LogOut, Key, Landmark, ClipboardCheck
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-[#050505] border-r border-gray-900 h-screen flex flex-col p-4 shrink-0">
      <div className="mb-8 px-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center font-bold text-white">V3</div>
        <h2 className="text-white font-black text-xl tracking-tighter">SIMPLY CORE</h2>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4 mb-2">Administracion</p>
          <Link href="/dashboard/gerencia" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white"> <LayoutDashboard size={18}/> Panel Gerencial </Link>
          <Link href="/dashboard/configuracion/marca" className="flex items-center gap-3 px-4 py-2 text-sm text-amber-500 font-bold bg-amber-500/10 rounded-lg"> <Palette size={18}/> CONFIGURACION </Link>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4 mb-2">Operaciones</p>
          <Link href="/dashboard/originador" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400"> <ClipboardCheck size={18}/> Originador </Link>
          <Link href="/dashboard/cartera" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400"> <Landmark size={18}/> Cartera Activa </Link>
        </div>
      </nav>
    </div>
  );
}
