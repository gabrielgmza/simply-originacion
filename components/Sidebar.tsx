"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardCheck, Landmark, Palette, Settings } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <div className="w-64 bg-[#050505] border-r border-gray-900 h-screen flex flex-col p-4 fixed left-0 top-0 z-50">
      <div className="mb-8 px-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center font-bold text-white">V3</div>
        <h2 className="text-white font-black text-xl tracking-tighter italic">SIMPLY CORE</h2>
      </div>
      <nav className="flex-1 space-y-2">
        <Link href="/dashboard/gerencia" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:text-white"> <LayoutDashboard size={18}/> Panel Gerencial </Link>
        <Link href="/dashboard/originador" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:text-white"> <ClipboardCheck size={18}/> Originador </Link>
        <Link href="/dashboard/cartera" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:text-white"> <Landmark size={18}/> Cartera Activa </Link>
        <div className="pt-4 mt-4 border-t border-gray-900">
          <Link href="/dashboard/configuracion/marca" className="flex items-center gap-3 px-4 py-3 text-sm text-amber-500 bg-amber-500/5 rounded-xl font-bold"> <Palette size={18}/> CONFIGURACION </Link>
        </div>
      </nav>
    </div>
  );
}
