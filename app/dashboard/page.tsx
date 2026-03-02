import Link from "next/link";
import { Search, Briefcase, FileSignature, Users } from "lucide-react";

export default function DashboardHome() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tight">Bienvenido a Simply</h1>
        <p className="text-gray-400 mt-2">Resumen de tu operativa y accesos rápidos.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TARJETA 1 */}
        <Link href="/dashboard/originador/legajo" className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-[24px] hover:border-blue-500 transition-all group flex flex-col items-center justify-center text-center gap-4">
          <div className="bg-blue-600/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
            <Search className="text-blue-500" size={32}/>
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-wide">Nuevo Legajo</h3>
            <p className="text-gray-500 text-xs mt-1">Auditar BCRA y Juicios</p>
          </div>
        </Link>

        {/* TARJETA 2 */}
        <Link href="/dashboard/cartera" className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-[24px] hover:border-green-500 transition-all group flex flex-col items-center justify-center text-center gap-4">
          <div className="bg-green-600/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
            <Briefcase className="text-green-500" size={32}/>
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-wide">Cartera Activa</h3>
            <p className="text-gray-500 text-xs mt-1">Gestión de Cobranzas</p>
          </div>
        </Link>

        {/* TARJETA 3 */}
        <Link href="/dashboard/legal" className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-[24px] hover:border-orange-500 transition-all group flex flex-col items-center justify-center text-center gap-4">
          <div className="bg-orange-600/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
            <FileSignature className="text-orange-500" size={32}/>
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-wide">Contratos</h3>
            <p className="text-gray-500 text-xs mt-1">Plantillas Legales</p>
          </div>
        </Link>

        {/* TARJETA 4 */}
        <Link href="/dashboard/equipo" className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-[24px] hover:border-purple-500 transition-all group flex flex-col items-center justify-center text-center gap-4">
          <div className="bg-purple-600/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
            <Users className="text-purple-500" size={32}/>
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-wide">Mi Equipo</h3>
            <p className="text-gray-500 text-xs mt-1">Usuarios y Roles</p>
          </div>
        </Link>

      </div>
    </div>
  );
}
