"use client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ImpersonacionBanner from "@/components/ImpersonacionBanner";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import {
  LayoutDashboard, UserCheck, Briefcase, Users,
  FileSignature, Webhook, Palette, Menu, X, LogOut,
  BadgeCheck, Key, TrendingUp, Banknote, PhoneCall, MessageSquare, Bell, Calculator, Building2
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { userData, entidadData } = useAuth();

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const logoUrl = entidadData?.configuracion?.logoUrl;
  const nombreEntidad = entidadData?.nombreFantasia || "Simply";

  const puedeAprobar = userData?.rol &&
    ["GERENTE_GENERAL", "GERENTE_SUCURSAL", "SUPERVISOR_SUCURSAL", "MASTER_PAYSUR"].includes(userData.rol);

  const puedeLiquidar = userData?.rol &&
    ["GERENTE_GENERAL", "LIQUIDADOR", "MASTER_PAYSUR"].includes(userData.rol);

  const puedeConfigurar = userData?.rol &&
    ["GERENTE_GENERAL", "MASTER_PAYSUR"].includes(userData.rol);

  const menu = [
    { nombre: "Dashboard",            ruta: "/dashboard",                      visible: true },
    { nombre: "Nuevo Legajo",          ruta: "/dashboard/originador/legajo",    visible: true },
    { nombre: "Panel de Aprobacion",   ruta: "/dashboard/aprobacion",           visible: puedeAprobar },
    { nombre: "Liquidacion",           ruta: "/dashboard/liquidacion",          visible: puedeLiquidar },
    { nombre: "Renovaciones",              ruta: "/dashboard/renovaciones",                visible: ["GERENTE_GENERAL","GERENTE_SUCURSAL","VENDEDOR","LIQUIDADOR","MASTER_PAYSUR"].includes(userData?.rol || "") },
    { nombre: "Pagos 360",                  ruta: "/dashboard/pagos360",                    visible: ["GERENTE_GENERAL","LIQUIDADOR","MASTER_PAYSUR"].includes(userData?.rol || "") },
    { nombre: "Liquidación Masiva",         ruta: "/dashboard/liquidacion/masiva",          visible: ["GERENTE_GENERAL","LIQUIDADOR","MASTER_PAYSUR"].includes(userData?.rol || "") },
    { nombre: "Revisión Onboarding",    ruta: "/dashboard/revision",                    visible: ["GERENTE_GENERAL","GERENTE_SUCURSAL","LIQUIDADOR","MASTER_PAYSUR"].includes(userData?.rol || "") },
    { nombre: "Cartera Activa",        ruta: "/dashboard/cartera",              visible: true },
    { nombre: "Simulador",             ruta: "/dashboard/simulador",            visible: true },
    { nombre: "Sucursales",            ruta: "/dashboard/sucursales",           visible: puedeConfigurar },
    { nombre: "Cobranzas",             ruta: "/dashboard/cobranzas",            visible: puedeLiquidar },
    { nombre: "Reportes",              ruta: "/dashboard/reportes",             visible: puedeAprobar },
    { nombre: "Equipo y Roles",        ruta: "/dashboard/equipo",               visible: puedeConfigurar },
    { nombre: "Plantillas Legales",    ruta: "/dashboard/legal",                visible: puedeConfigurar },
    { nombre: "Credenciales CUAD",     ruta: "/dashboard/credenciales",         visible: puedeConfigurar },
    { nombre: "Configuracion API",     ruta: "/dashboard/configuracion/api",    visible: puedeConfigurar },
    { nombre: "Marca",                 ruta: "/dashboard/configuracion/marca",  visible: puedeConfigurar },
    { nombre: "WhatsApp",              ruta: "/dashboard/configuracion/whatsapp", visible: puedeConfigurar },
    { nombre: "Notificaciones",        ruta: "/dashboard/configuracion/notificaciones", visible: puedeConfigurar },
    { nombre: "Política de Mora",        ruta: "/dashboard/configuracion/mora",          visible: puedeConfigurar },
    { nombre: "Campos Onboarding",        ruta: "/dashboard/configuracion/onboarding",    visible: puedeConfigurar },
    { nombre: "Scoring Crediticio",        ruta: "/dashboard/configuracion/scoring",       visible: puedeConfigurar },
    { nombre: "Portal del Cliente",         ruta: "/dashboard/configuracion/portal",        visible: puedeConfigurar },
    { nombre: "Liquidación Masiva",         ruta: "/dashboard/configuracion/liquidacion",    visible: puedeConfigurar },
    { nombre: "Fondeadores",                 ruta: "/dashboard/configuracion/fondeadores",   visible: puedeConfigurar },
    { nombre: "Reportes",                 ruta: "/dashboard/reportes",                    visible: puedeConfigurar },
  ];

  const iconos: Record<string, React.ReactNode> = {
    "/dashboard":                     <LayoutDashboard size={20} />,
    "/dashboard/originador/legajo":   <UserCheck size={20} />,
    "/dashboard/aprobacion":          <BadgeCheck size={20} />,
    "/dashboard/liquidacion":         <Banknote size={20} />,
    "/dashboard/cartera":             <Briefcase size={20} />,
    "/dashboard/simulador":           <Calculator size={20} />,
    "/dashboard/sucursales":          <Building2 size={20} />,
    "/dashboard/cobranzas":           <PhoneCall size={20} />,
    "/dashboard/reportes":            <TrendingUp size={20} />,
    "/dashboard/equipo":              <Users size={20} />,
    "/dashboard/legal":               <FileSignature size={20} />,
    "/dashboard/credenciales":        <Key size={20} />,
    "/dashboard/configuracion/api":   <Webhook size={20} />,
    "/dashboard/configuracion/marca": <Palette size={20} />,
    "/dashboard/configuracion/whatsapp": <MessageSquare size={20} />,
    "/dashboard/configuracion/notificaciones": <Bell size={20} />,
  };

  const cerrarSesion = async () => {
    await auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans">

      <div className="md:hidden flex items-center justify-between bg-[#0A0A0A] border-b border-gray-800 p-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {logoUrl
            ? <img src={logoUrl} alt={nombreEntidad} className="h-8 object-contain" />
            : <>
                <div className="font-black px-2 py-1 rounded text-white text-sm" style={{ backgroundColor: colorPrimario }}>S</div>
                <span className="text-white font-black italic text-xl">{nombreEntidad}</span>
              </>
          }
        </div>
        <button onClick={() => setMenuAbierto(!menuAbierto)} className="text-white">
          {menuAbierto ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      <aside className={`
        ${menuAbierto ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#0A0A0A] border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out
      `}>
        <div className="hidden md:flex items-center gap-2 p-6">
          {logoUrl
            ? <img src={logoUrl} alt={nombreEntidad} className="h-9 object-contain" />
            : <>
                <div className="font-black px-2 py-1 rounded text-white" style={{ backgroundColor: colorPrimario }}>S</div>
                <span className="text-white font-black italic text-2xl">{nombreEntidad}</span>
              </>
          }
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menu.filter(item => item.visible).map((item) => {
            const activo = pathname === item.ruta ||
              (item.ruta !== "/dashboard" && pathname.startsWith(item.ruta));
            return (
              <Link key={item.ruta} href={item.ruta} onClick={() => setMenuAbierto(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                  activo ? "text-white" : "text-gray-400 hover:text-white hover:bg-gray-900"
                }`}
                style={activo ? {
                  backgroundColor: `${colorPrimario}22`,
                  border: "1px solid",
                  borderColor: `${colorPrimario}44`,
                } : {}}>
                <span style={activo ? { color: colorPrimario } : {}}>{iconos[item.ruta]}</span>
                {item.nombre}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          {userData && (
            <div className="px-4 py-2">
              <p className="text-xs text-white font-bold truncate">{userData.nombre || userData.email}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{userData.rol}</p>
            </div>
          )}
          <button onClick={cerrarSesion}
            className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-950/30 rounded-xl transition-all font-bold text-sm w-full">
            <LogOut size={20} /> Cerrar Sesion
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <ImpersonacionBanner />
      <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>

      {menuAbierto && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMenuAbierto(false)} />
      )}
    </div>
  );
}
