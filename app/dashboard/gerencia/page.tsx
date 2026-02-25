"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Building2, Users, Wallet, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GerenciaDashboard() {
  const { entidadData, userData } = useAuth();
  const router = useRouter();
  
  const [cargando, setCargando] = useState(true);
  const [metricas, setMetricas] = useState({
    capitalColocado: 0,
    operacionesMes: 0,
    equipoActivo: 0,
    enMora: 0
  });

  useEffect(() => {
    const cargarMetricas = async () => {
      if (!userData?.entidadId) return;
      setCargando(true);
      
      try {
        const qOps = query(collection(db, "operaciones"), where("entidadId", "==", userData.entidadId));
        const snapOps = await getDocs(qOps);
        
        let capColocado = 0;
        let opsMes = 0;
        let mora = 0;
        
        const ahora = new Date();
        const mesActual = ahora.getMonth();
        const anioActual = ahora.getFullYear();

        snapOps.forEach((doc) => {
          const data = doc.data();
          const fechaCrea = data.fechaCreacion ? new Date(data.fechaCreacion.seconds * 1000) : null;
          
          if (fechaCrea && fechaCrea.getMonth() === mesActual && fechaCrea.getFullYear() === anioActual) {
            opsMes++;
          }

          if (data.estado === "LIQUIDADO" || data.estado === "FINALIZADO") {
            capColocado += Number(data.financiero?.montoSolicitado || 0);
          }
          
          if (data.estado === "MORA" || data.estado === "REINTENTO_PROGRAMADO") {
             mora++;
          }
        });

        const qUsers = query(collection(db, "usuarios"), where("entidadId", "==", userData.entidadId), where("activo", "==", true));
        const snapUsers = await getDocs(qUsers);
        const eqActivo = snapUsers.size;

        setMetricas({
          capitalColocado: capColocado,
          operacionesMes: opsMes,
          equipoActivo: eqActivo,
          enMora: mora
        });

      } catch (error) {
        console.error("Error al cargar metricas:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarMetricas();
  }, [userData]);

  if (!entidadData) return null;

  const colorPrimario = entidadData.configuracion?.colorPrimario || "#FF5E14";
  const formatearMoneda = (monto: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in font-sans text-[#F8F9FA]">
      <header className="mb-10 border-b border-gray-800 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Centro de Gerencia</h1>
          <p className="text-gray-400">Bienvenido, {userData?.nombre}. Resumen operativo en tiempo real de {entidadData.nombreFantasia}.</p>
        </div>
        {cargando && <Loader2 className="animate-spin text-gray-500" size={24} />}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-gray-900" style={{ color: colorPrimario }}>
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Capital Colocado</p>
              <p className="text-2xl font-bold text-white">
                {cargando ? "..." : formatearMoneda(metricas.capitalColocado)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Total histórico de créditos liquidados.</p>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-gray-900 text-green-500">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Operaciones del Mes</p>
              <p className="text-2xl font-bold text-white">
                {cargando ? "..." : metricas.operacionesMes}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Créditos generados en el mes en curso.</p>
        </div>

        <div className="bg-[#0A0A0A] border border-red-900/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-red-500/10 to-transparent rounded-bl-full"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-red-950/50 text-red-500 border border-red-900/50">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Alertas de Mora</p>
              <p className="text-2xl font-bold text-red-500">
                {cargando ? "..." : metricas.enMora}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Operaciones rechazadas o en reintento.</p>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-gray-900 text-blue-500">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Equipo Activo</p>
              <p className="text-2xl font-bold text-white">
                {cargando ? "..." : metricas.equipoActivo}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Usuarios habilitados para operar.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[250px]">
          <Building2 size={48} className="mx-auto text-gray-700 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Módulos Contratados</h2>
          <div className="flex gap-3 mt-4 flex-wrap justify-center">
            {entidadData.configuracion.moduloAdelantos && <span className="px-4 py-2 bg-gray-900 border border-gray-700 text-sm rounded-lg font-medium">🚀 Adelantos (Pagos360)</span>}
            {entidadData.configuracion.moduloCuad && <span className="px-4 py-2 bg-gray-900 border border-gray-700 text-sm rounded-lg font-medium">🏛️ Empleados Públicos (CUAD)</span>}
            {entidadData.configuracion.moduloPrivados && <span className="px-4 py-2 bg-gray-900 border border-gray-700 text-sm rounded-lg font-medium">💼 Línea Privados</span>}
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 flex flex-col justify-center">
          <h2 className="text-lg font-bold text-white mb-4">Accesos Rápidos</h2>
          <div className="space-y-3">
            <button onClick={() => router.push("/dashboard/originacion")} className="w-full text-left px-6 py-4 bg-[#111] hover:bg-gray-900 border border-gray-800 rounded-xl transition-colors font-medium flex justify-between items-center group">
              Nuevo Legajo de Crédito
              <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: colorPrimario }}>→</span>
            </button>
            <button onClick={() => router.push("/dashboard/operaciones")} className="w-full text-left px-6 py-4 bg-[#111] hover:bg-gray-900 border border-gray-800 rounded-xl transition-colors font-medium flex justify-between items-center group">
              Ver Cartera Activa y Exportar
              <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: colorPrimario }}>→</span>
            </button>
            <button onClick={() => router.push("/dashboard/equipo")} className="w-full text-left px-6 py-4 bg-[#111] hover:bg-gray-900 border border-gray-800 rounded-xl transition-colors font-medium flex justify-between items-center group">
              Alta de Nuevo Vendedor
              <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: colorPrimario }}>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
