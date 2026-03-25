"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import {
  LayoutDashboard, UserCheck, BadgeCheck, Banknote, ChevronDown,
  Briefcase, PhoneCall, Users, FileSignature, Webhook, Palette,
  Menu, X, LogOut, Key, TrendingUp, MessageSquare, Bell,
  Calculator, Building2, CreditCard, RefreshCw, Settings,
  BarChart3, UserPlus, Shield, Mail, Layers
} from "lucide-react";

type MenuItem = { nombre: string; ruta: string; icono: React.ReactNode; visible: boolean };
type Grupo = { label: string; icono: React.ReactNode; items: MenuItem[] };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({
    operaciones: true, cartera: false, clientes: false, equipo: false, configuracion: false
  });
  const { userData, entidadData } = useAuth();

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const logoUrl       = entidadData?.configuracion?.logoUrl;
  const nombreEntidad = entidadData?.nombreFantasia || "Simply";

  const puedeAprobar    = ["GERENTE_GENERAL","GERENTE_SUCURSAL","SUPERVISOR_SUCURSAL","MASTER_PAYSUR"].includes(userData?.rol || "");
  const puedeLiquidar   = ["GERENTE_GENERAL","LIQUIDADOR","MASTER_PAYSUR"].includes(userData?.rol || "");
  const puedeConfigurar = ["GERENTE_GENERAL","MASTER_PAYSUR"].includes(userData?.rol || "");
  const puedeVender     = ["GERENTE_GENERAL","GERENTE_SUCURSAL","VENDEDOR","MASTER_PAYSUR"].includes(userData?.rol || "");

  const modulos = entidadData?.modulosHabilitados || {};

  const grupos: Grupo[] = [
    {
      label: "Operaciones",
      icono: <Layers size={15}/>,
      items: [
        { nombre: "Nuevo Legajo",        ruta: "/dashboard/originador/legajo", icono: <UserCheck size={16}/>,  visible: puedeVender },
        { nombre: "Panel de Aprobacion", ruta: "/dashboard/aprobacion",        icono: <BadgeCheck size={16}/>, visible: puedeAprobar },
        { nombre: "Liquidacion",         ruta: "/dashboard/liquidacion",       icono: <Banknote size={16}/>,   visible: puedeLiquidar },
        { nombre: "Liquidacion Masiva",  ruta: "/dashboard/liquidacion/masiva",icono: <Banknote size={16}/>,   visible: puedeLiquidar },
        { nombre: "Pagos 360",           ruta: "/dashboard/pagos360",          icono: <CreditCard size={16}/>, visible: puedeLiquidar && !!modulos.pagos360 },
      ]
    },
    {
      label: "Cartera",
      icono: <Briefcase size={15}/>,
      items: [
        { nombre: "Cartera Activa",  ruta: "/dashboard/cartera",      icono: <Briefcase size={16}/>,  visible: true },
        { nombre: "Cobranzas",       ruta: "/dashboard/cobranzas",    icono: <PhoneCall size={16}/>,  visible: puedeLiquidar },
        { nombre: "Renovaciones",    ruta: "/dashboard/renovaciones", icono: <RefreshCw size={16}/>,  visible: puedeVender && !!modulos.renovaciones },
        { nombre: "Leads",           ruta: "/dashboard/leads",        icono: <UserPlus size={16}/>,   visible: puedeVender },
      ]
    },
    {
      label: "Clientes",
      icono: <UserCheck size={15}/>,
      items: [
        { nombre: "Revision Onboarding", ruta: "/dashboard/revision",   icono: <Shield size={16}/>,     visible: puedeAprobar },
        { nombre: "Simulador",           ruta: "/dashboard/simulador",  icono: <Calculator size={16}/>, visible: true },
      ]
    },
    {
      label: "Reportes & Equipo",
      icono: <BarChart3 size={15}/>,
      items: [
        { nombre: "Reportes",     ruta: "/dashboard/reportes", icono: <TrendingUp size={16}/>, visible: puedeAprobar },
        { nombre: "Equipo y Roles", ruta: "/dashboard/equipo", icono: <Users size={16}/>,      visible: puedeConfigurar },
        { nombre: "Sucursales",   ruta: "/dashboard/sucursales", icono: <Building2 size={16}/>, visible: puedeConfigurar },
      ]
    },
    {
      label: "Configuracion",
      icono: <Settings size={15}/>,
      items: [
        { nombre: "Marca",              ruta: "/dashboard/configuracion/marca",         icono: <Palette size={16}/>,      visible: puedeConfigurar },
        { nombre: "WhatsApp",           ruta: "/dashboard/configuracion/whatsapp",      icono: <MessageSquare size={16}/>, visible: puedeConfigurar },
        { nombre: "Credenciales CUAD",  ruta: "/dashboard/credenciales",                icono: <Key size={16}/>,           visible: puedeConfigurar && !!modulos.cuad },
        { nombre: "Productos",          ruta: "/dashboard/configuracion/productos",    icono: <Layers size={16}/>,        visible: puedeConfigurar },
        { nombre: "Scoring Crediticio", ruta: "/dashboard/configuracion/scoring",       icono: <Shield size={16}/>,        visible: puedeConfigurar },
        { nombre: "Politica de Mora",   ruta: "/dashboard/configuracion/mora",          icono: <BadgeCheck size={16}/>,    visible: puedeConfigurar },
        { nombre: "Campos Onboarding",  ruta: "/dashboard/configuracion/onboarding",    icono: <FileSignature size={16}/>, visible: puedeConfigurar },
        { nombre: "Liquidacion Config", ruta: "/dashboard/configuracion/liquidacion",   icono: <Banknote size={16}/>,      visible: puedeConfigurar },
        { nombre: "Fondeadores",        ruta: "/dashboard/configuracion/fondeadores",   icono: <Layers size={16}/>,        visible: puedeConfigurar && !!modulos.fondeadores },
        { nombre: "Plantillas Legales", ruta: "/dashboard/legal",                       icono: <FileSignature size={16}/>, visible: puedeConfigurar },
        { nombre: "Notificaciones",     ruta: "/dashboard/configuracion/notificaciones",icono: <Bell size={16}/>,          visible: puedeConfigurar },
        { nombre: "Email",              ruta: "/dashboard/configuracion/email",         icono: <Mail size={16}/>,          visible: puedeConfigurar && !!modulos.email },
        { nombre: "Configuracion API",  ruta: "/dashboard/configuracion/api",           icono: <Webhook size={16}/>,       visible: puedeConfigurar },
      ]
    },
  ];

  const toggleGrupo = (key: string) =>
    setGruposAbiertos(p => ({ ...p, [key]: !p[key] }));

  const grupoKeys = ["operaciones","cartera","clientes","equipo","configuracion"];

  // Auto-abrir grupo activo
  const grupoActivo = grupos.findIndex(g => g.items.some(i => pathname === i.ruta || (i.ruta !== "/dashboard" && pathname.startsWith(i.ruta))));

  const cerrarSesion = async () => {
    await auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const Sidebar = () => (
    <aside className={`${menuAbierto ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#0A0A0A] border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out`}>
      {/* Logo */}
      <div className="hidden md:flex items-center gap-2 p-6 border-b border-gray-900">
        {logoUrl
          ? <img src={logoUrl} alt={nombreEntidad} className="h-9 object-contain"/>
          : <>
              <div className="font-black px-2 py-1 rounded text-white text-sm" style={{ backgroundColor: colorPrimario }}>{nombreEntidad[0]}</div>
              <span className="text-white font-black italic text-xl">{nombreEntidad}</span>
            </>}
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {/* Dashboard siempre visible */}
        <Link href="/dashboard" onClick={() => setMenuAbierto(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm mb-2 ${pathname === "/dashboard" ? "text-white" : "text-gray-400 hover:text-white hover:bg-gray-900"}`}
          style={pathname === "/dashboard" ? { backgroundColor: `${colorPrimario}22`, border: "1px solid", borderColor: `${colorPrimario}44` } : {}}>
          <span style={pathname === "/dashboard" ? { color: colorPrimario } : {}}><LayoutDashboard size={16}/></span>
          Dashboard
        </Link>

        {/* Grupos colapsables */}
        {grupos.map((grupo, gi) => {
          const key = grupoKeys[gi];
          const itemsVisibles = grupo.items.filter(i => i.visible);
          if (itemsVisibles.length === 0) return null;
          const abierto = gruposAbiertos[key] ?? (grupoActivo === gi);
          const tieneActivo = grupo.items.some(i => pathname === i.ruta || (i.ruta !== "/dashboard" && pathname.startsWith(i.ruta)));

          return (
            <div key={key}>
              <button onClick={() => toggleGrupo(key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tieneActivo ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                style={tieneActivo ? { color: colorPrimario } : {}}>
                <span className="flex items-center gap-2">{grupo.icono} {grupo.label}</span>
                <ChevronDown size={13} className={`transition-transform ${abierto ? "rotate-180" : ""}`}/>
              </button>

              {abierto && (
                <div className="mt-1 ml-2 space-y-0.5 border-l border-gray-900 pl-3">
                  {itemsVisibles.map(item => {
                    const activo = pathname === item.ruta || (item.ruta !== "/dashboard" && pathname.startsWith(item.ruta));
                    return (
                      <Link key={item.ruta} href={item.ruta} onClick={() => setMenuAbierto(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-bold text-sm ${activo ? "text-white" : "text-gray-500 hover:text-gray-300 hover:bg-gray-900"}`}
                        style={activo ? { backgroundColor: `${colorPrimario}22`, color: colorPrimario } : {}}>
                        {item.icono} {item.nombre}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        {userData && (
          <div className="px-3 py-2">
            <p className="text-xs text-white font-bold truncate">{userData.nombre || userData.email}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{userData.rol}</p>
          </div>
        )}
        <button onClick={cerrarSesion}
          className="flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-950/30 rounded-xl transition-all font-bold text-sm w-full">
          <LogOut size={16}/> Cerrar Sesion
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans">
      {/* Mobile topbar */}
      <div className="md:hidden flex items-center justify-between bg-[#0A0A0A] border-b border-gray-800 p-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {logoUrl
            ? <img src={logoUrl} alt={nombreEntidad} className="h-8 object-contain"/>
            : <>
                <div className="font-black px-2 py-1 rounded text-white text-sm" style={{ backgroundColor: colorPrimario }}>{nombreEntidad[0]}</div>
                <span className="text-white font-black italic text-xl">{nombreEntidad}</span>
              </>}
        </div>
        <button onClick={() => setMenuAbierto(!menuAbierto)} className="text-white">
          {menuAbierto ? <X size={28}/> : <Menu size={28}/>}
        </button>
      </div>

      <Sidebar/>

      {menuAbierto && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMenuAbierto(false)}/>}

      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
