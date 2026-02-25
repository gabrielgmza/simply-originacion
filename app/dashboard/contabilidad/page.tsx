"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { PieChart, BarChart3, Landmark, ArrowUpRight, ArrowDownRight, RefreshCcw } from "lucide-react";

export default function ContabilidadDashboard() {
  const { entidadData } = useAuth();
  const [saldos, setSaldos] = useState<any>({ activo: 0, pasivo: 0, ingresos: 0, egresos: 0 });
  const [cargando, setCargando] = useState(true);

  const calcularBalances = async () => {
    if (!entidadData?.id) return;
    setCargando(true);
    
    const q = query(collection(db, "contabilidad_asientos"), where("entidadId", "==", entidadData.id));
    const snap = await getDocs(q);
    
    let balances = { activo: 0, pasivo: 0, ingresos: 0, egresos: 0 };

    snap.docs.forEach(doc => {
      const asiento = doc.data();
      asiento.movimientos.forEach((m: any) => {
        // Lógica simplificada de saldos por tipo de cuenta
        if (m.cuentaId.startsWith('1')) balances.activo += (m.debe - m.haber);
        if (m.cuentaId.startsWith('2')) balances.pasivo += (m.haber - m.debe);
        if (m.cuentaId.startsWith('4')) balances.ingresos += (m.haber - m.debe);
        if (m.cuentaId.startsWith('5')) balances.egresos += (m.debe - m.haber);
      });
    });

    setSaldos(balances);
    setCargando(false);
  };

  useEffect(() => { calcularBalances(); }, [entidadData]);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Landmark style={{ color: colorPrimario }} /> Reporte Financiero & Contable
          </h1>
          <p className="text-gray-400">Estado de situación patrimonial y resultados en tiempo real.</p>
        </div>
        <button onClick={calcularBalances} className="p-3 bg-gray-900 rounded-xl hover:bg-gray-800 transition-all">
          <RefreshCcw size={20} className={cargando ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-2xl">
          <p className="text-xs text-gray-500 uppercase font-bold mb-2">Activo Total (Cartera)</p>
          <p className="text-2xl font-black">${saldos.activo.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-2xl">
          <p className="text-xs text-gray-500 uppercase font-bold mb-2">Ingresos Devengados</p>
          <p className="text-2xl font-black text-green-500">+${saldos.ingresos.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-2xl">
          <p className="text-xs text-gray-500 uppercase font-bold mb-2">Egresos / Gastos</p>
          <p className="text-2xl font-black text-red-500">-${saldos.egresos.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-2xl" style={{ borderLeft: `4px solid ${colorPrimario}` }}>
          <p className="text-xs text-gray-500 uppercase font-bold mb-2">Utilidad Neta Estimada</p>
          <p className="text-2xl font-black">${(saldos.ingresos - saldos.egresos).toLocaleString('es-AR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-2xl">
          <h3 className="font-bold mb-6 flex items-center gap-2"><BarChart3 size={18} /> Composición de Ingresos</h3>
          <div className="h-64 flex items-center justify-center border border-dashed border-gray-800 rounded-xl">
             <p className="text-gray-600 text-sm">Gráfico de Intereses vs Comisiones (Procesando...)</p>
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-2xl">
          <h3 className="font-bold mb-6 flex items-center gap-2"><PieChart size={18} /> Origen de Fondos</h3>
          <div className="h-64 flex items-center justify-center border border-dashed border-gray-800 rounded-xl">
             <p className="text-gray-600 text-sm">Distribución por Fondeador (Procesando...)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
