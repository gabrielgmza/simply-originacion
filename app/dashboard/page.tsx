'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

export default function DashboardHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOperaciones: 0,
    montoTotal: 0,
    pendientesFirma: 0,
    listasLiquidar: 0,
    liquidadas: 0
  });
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push('/login');
      setUserName(user.email?.split('@')[0] || 'Usuario');
      await loadMetrics(user.email);
    });
    return () => unsubscribe();
  }, [router]);

  const loadMetrics = async (email: string | null) => {
    if (!email) return;
    try {
      // Por simplicidad en MVP, mostramos las métricas de todas las operaciones 
      // (en producción filtraríamos por entidad/rol como en la bandeja)
      const qOps = collection(db, 'operaciones');
      const querySnapshot = await getDocs(qOps);
      
      let totalOps = 0;
      let monto = 0;
      let pendientes = 0;
      let listas = 0;
      let liquidadas = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalOps++;
        monto += (data.montoSolicitado || 0);
        
        if (data.estado === 'PENDIENTE_FIRMA') pendientes++;
        if (data.estado === 'LISTO_PARA_LIQUIDAR') listas++;
        if (data.estado === 'LIQUIDADO') liquidadas++;
      });

      setStats({
        totalOperaciones: totalOps,
        montoTotal: monto,
        pendientesFirma: pendientes,
        listasLiquidar: listas,
        liquidadas: liquidadas
      });

    } catch (error) {
      console.error("Error cargando métricas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) return <div className="p-10 text-center bg-gray-50 min-h-screen">Cargando tu panel...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto text-black bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, {userName} 👋</h1>
          <p className="text-sm text-gray-500">Bienvenido al Centro de Comando Simply.</p>
        </div>
        <button onClick={handleLogout} className="text-red-500 hover:text-red-700 font-medium text-sm border border-red-200 bg-red-50 px-4 py-2 rounded-lg transition-colors">
          Cerrar Sesión
        </button>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Volumen Solicitado</p>
          <p className="text-3xl font-black text-blue-600">${stats.montoTotal.toLocaleString()}</p>
          <div className="mt-2 text-xs text-gray-400">En {stats.totalOperaciones} operaciones totales</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-500 font-medium mb-1">Listas para Liquidar</p>
          <p className="text-3xl font-black text-gray-800">{stats.listasLiquidar}</p>
          <div className="mt-2 text-xs text-green-600 font-bold bg-green-50 inline-block px-2 py-1 rounded">Requieren Acción</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-yellow-100 border-l-4 border-l-yellow-400">
          <p className="text-sm text-gray-500 font-medium mb-1">Esperando Firma</p>
          <p className="text-3xl font-black text-gray-800">{stats.pendientesFirma}</p>
          <div className="mt-2 text-xs text-yellow-600 font-bold bg-yellow-50 inline-block px-2 py-1 rounded">Enviadas al cliente</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500 font-medium mb-1">Créditos Liquidados</p>
          <p className="text-3xl font-black text-gray-800">{stats.liquidadas}</p>
          <div className="mt-2 text-xs text-blue-600 font-bold bg-blue-50 inline-block px-2 py-1 rounded">Finalizadas con éxito</div>
        </div>
      </div>

      {/* ACCESOS RÁPIDOS */}
      <h2 className="text-lg font-bold text-gray-800 mb-4">Accesos Rápidos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <button onClick={() => router.push('/dashboard/originacion')} className="group flex flex-col items-center justify-center p-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all text-white text-center">
          <div className="bg-white/20 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
             <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          </div>
          <h3 className="text-xl font-bold">Nueva Operación</h3>
          <p className="text-blue-100 text-sm mt-2 max-w-xs">Abre el simulador para consultar DNI, validar riesgo y generar un nuevo crédito.</p>
        </button>

        <button onClick={() => router.push('/dashboard/operaciones')} className="group flex flex-col items-center justify-center p-10 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-gray-800 text-center">
          <div className="bg-gray-100 p-4 rounded-full mb-4 group-hover:bg-blue-50 transition-colors">
             <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <h3 className="text-xl font-bold">Bandeja de Operaciones</h3>
          <p className="text-gray-500 text-sm mt-2 max-w-xs">Visualiza las ventas, liquida créditos pendientes y exporta a Excel/PDF.</p>
        </button>

      </div>
    </div>
  );
}
