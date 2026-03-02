"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  UserCheck, Briefcase, BadgeCheck, Banknote,
  TrendingUp, AlertTriangle, Clock, CheckCircle2,
  ArrowRight, Loader2, Users, Search
} from "lucide-react";

interface KPIs {
  montoMes: number;
  pendientesAprobacion: number;
  pendientesLiquidar: number;
  enMora: number;
  totalOps: number;
  liquidadasMes: number;
}

interface OpReciente {
  id: string;
  estado: string;
  estadoAprobacion?: string;
  cliente?: { nombre?: string; dni?: string };
  financiero?: { montoSolicitado?: number };
  fechaCreacion?: any;
}

export default function DashboardHome() {
  const { userData, entidadData } = useAuth();
  const [kpis, setKpis] = useState<KPIs>({
    montoMes: 0, pendientesAprobacion: 0, pendientesLiquidar: 0,
    enMora: 0, totalOps: 0, liquidadasMes: 0,
  });
  const [recientes, setRecientes] = useState<OpReciente[]>([]);
  const [loading, setLoading] = useState(true);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const nombre = userData?.nombre?.split(" ")[0] || "bienvenido";

  // ── Hora del día ──
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  // ── Cargar KPIs ──
  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      setLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, "operaciones"), where("entidadId", "==", entidadData.id))
        );
        const ops = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // Mes actual
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

        const delMes = ops.filter(o => {
          const f = o.fechaCreacion?.toDate?.() || new Date(o.fechaCreacion || 0);
          return f >= inicioMes;
        });

        setKpis({
          montoMes: delMes.reduce((a: number, o: any) => a + (o.financiero?.montoSolicitado || 0), 0),
          liquidadasMes: delMes.filter((o: any) => o.estado === "LIQUIDADO").length,
          pendientesAprobacion: ops.filter((o: any) => o.estadoAprobacion === "PENDIENTE_APROBACION").length,
          pendientesLiquidar: ops.filter((o: any) => o.estadoAprobacion === "APROBADO" && o.estado !== "LIQUIDADO" && o.estado !== "FINALIZADO").length,
          enMora: ops.filter((o: any) => o.estado === "EN_MORA").length,
          totalOps: ops.length,
        });

        // Últimas 5 operaciones
        const ordenadas = [...ops].sort((a: any, b: any) => {
          const fa = a.fechaCreacion?.toDate?.() || new Date(0);
          const fb = b.fechaCreacion?.toDate?.() || new Date(0);
          return fb.getTime() - fa.getTime();
        }).slice(0, 5);
        setRecientes(ordenadas);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    cargar();
  }, [entidadData]);

  // ── Accesos rápidos según rol ──
  const accesos = [
    {
      label: "Nuevo Legajo",
      desc: "Auditar BCRA y originar",
      href: "/dashboard/originador/legajo",
      icono: <Search size={24} />,
      color: "#3b82f6",
      roles: ["GERENTE_GENERAL","GERENTE_SUCURSAL","SUPERVISOR_SUCURSAL","VENDEDOR","MASTER_PAYSUR"],
    },
    {
      label: "Aprobaciones",
      desc: `${kpis.pendientesAprobacion} pendientes`,
      href: "/dashboard/aprobacion",
      icono: <BadgeCheck size={24} />,
      color: "#8b5cf6",
      roles: ["GERENTE_GENERAL","GERENTE_SUCURSAL","SUPERVISOR_SUCURSAL","MASTER_PAYSUR"],
    },
    {
      label: "Liquidación",
      desc: `${kpis.pendientesLiquidar} para desembolsar`,
      href: "/dashboard/liquidacion",
      icono: <Banknote size={24} />,
      color: colorPrimario,
      roles: ["GERENTE_GENERAL","LIQUIDADOR","MASTER_PAYSUR"],
    },
    {
      label: "Cartera",
      desc: `${kpis.totalOps} operaciones`,
      href: "/dashboard/cartera",
      icono: <Briefcase size={24} />,
      color: "#22c55e",
      roles: ["GERENTE_GENERAL","GERENTE_SUCURSAL","SUPERVISOR_SUCURSAL","LIQUIDADOR","MASTER_PAYSUR"],
    },
    {
      label: "Reportes",
      desc: "Producción del mes",
      href: "/dashboard/reportes",
      icono: <TrendingUp size={24} />,
      color: "#f59e0b",
      roles: ["GERENTE_GENERAL","GERENTE_SUCURSAL","SUPERVISOR_SUCURSAL","MASTER_PAYSUR"],
    },
    {
      label: "Equipo",
      desc: "Usuarios y roles",
      href: "/dashboard/equipo",
      icono: <Users size={24} />,
      color: "#ec4899",
      roles: ["GERENTE_GENERAL","MASTER_PAYSUR"],
    },
  ].filter(a => !userData?.rol || a.roles.includes(userData.rol));

  const estadoColor: Record<string, string> = {
    LIQUIDADO:            "text-green-400",
    APROBADO:             "text-blue-400",
    PENDIENTE_APROBACION: "text-yellow-400",
    RECHAZADO:            "text-red-400",
    EN_MORA:              "text-red-500",
    FINALIZADO:           "text-gray-500",
  };

  const estadoLabel: Record<string, string> = {
    LIQUIDADO:            "Liquidado",
    APROBADO:             "Aprobado",
    PENDIENTE_APROBACION: "Pendiente",
    RECHAZADO:            "Rechazado",
    EN_MORA:              "En Mora",
    FINALIZADO:           "Finalizado",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* SALUDO */}
      <div>
        <h1 className="text-3xl font-black text-white italic tracking-tight">
          {saludo}, {nombre} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-gray-600" size={32} />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                label: "Monto del mes",
                valor: `$${(kpis.montoMes / 1000).toFixed(0)}K`,
                sub: `${kpis.liquidadasMes} liquidadas`,
                icono: <TrendingUp size={18} />,
                color: colorPrimario,
                alerta: false,
              },
              {
                label: "Pendientes aprobac.",
                valor: kpis.pendientesAprobacion,
                sub: "requieren revisión",
                icono: <Clock size={18} />,
                color: "#8b5cf6",
                alerta: kpis.pendientesAprobacion > 0,
              },
              {
                label: "Para liquidar",
                valor: kpis.pendientesLiquidar,
                sub: "aprobadas sin desembolso",
                icono: <Banknote size={18} />,
                color: "#f59e0b",
                alerta: kpis.pendientesLiquidar > 0,
              },
              {
                label: "En mora",
                valor: kpis.enMora,
                sub: "clientes con atraso",
                icono: <AlertTriangle size={18} />,
                color: "#ef4444",
                alerta: kpis.enMora > 0,
              },
              {
                label: "Total operaciones",
                valor: kpis.totalOps,
                sub: "en la entidad",
                icono: <Briefcase size={18} />,
                color: "#3b82f6",
                alerta: false,
              },
              {
                label: "Liquidadas mes",
                valor: kpis.liquidadasMes,
                sub: "desembolsadas",
                icono: <CheckCircle2 size={18} />,
                color: "#22c55e",
                alerta: false,
              },
            ].map((k, i) => (
              <div key={i} className={`bg-[#0A0A0A] border rounded-2xl p-4 transition-all ${k.alerta && k.valor > 0 ? "border-opacity-50" : "border-gray-800"}`}
                style={k.alerta && k.valor > 0 ? { borderColor: `${k.color}55` } : {}}>
                <div className="mb-2" style={{ color: k.color }}>{k.icono}</div>
                <p className="text-2xl font-black text-white">{k.valor}</p>
                <p className="text-xs font-bold text-gray-300 mt-0.5">{k.label}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ACCESOS RÁPIDOS */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Accesos rápidos</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {accesos.map((a) => (
                <Link key={a.href} href={a.href}
                  className="bg-[#0A0A0A] border border-gray-800 hover:border-gray-600 p-5 rounded-2xl flex flex-col gap-3 group transition-all hover:-translate-y-0.5">
                  <div className="p-2.5 rounded-xl w-fit transition-all"
                    style={{ backgroundColor: `${a.color}20` }}>
                    <span style={{ color: a.color }}>{a.icono}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{a.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors mt-auto" />
                </Link>
              ))}
            </div>
          </div>

          {/* ACTIVIDAD RECIENTE */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Actividad reciente</p>
              <Link href="/dashboard/cartera" className="text-xs font-bold hover:underline" style={{ color: colorPrimario }}>
                Ver todo →
              </Link>
            </div>

            {recientes.length === 0 ? (
              <div className="text-center py-10 text-gray-600 bg-[#0A0A0A] border border-gray-800 rounded-2xl">
                <Briefcase size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Sin operaciones todavía.</p>
              </div>
            ) : (
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-900">
                    <tr>
                      {["Cliente", "Monto", "Estado", "Fecha"].map(h => (
                        <th key={h} className="px-5 py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900">
                    {recientes.map(op => {
                      const estadoMostrar = op.estadoAprobacion === "PENDIENTE_APROBACION"
                        ? "PENDIENTE_APROBACION" : op.estado;
                      return (
                        <tr key={op.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-bold text-white text-sm">{op.cliente?.nombre || "—"}</p>
                            <p className="text-xs text-gray-600 font-mono">{op.cliente?.dni}</p>
                          </td>
                          <td className="px-5 py-3 font-bold text-white text-sm">
                            ${(op.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-black ${estadoColor[estadoMostrar] || "text-gray-500"}`}>
                              {estadoLabel[estadoMostrar] || estadoMostrar}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500">
                            {op.fechaCreacion?.toDate?.()?.toLocaleDateString("es-AR") || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
