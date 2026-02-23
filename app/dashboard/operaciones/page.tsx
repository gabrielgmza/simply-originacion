'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

export default function OperacionesPage() {
  const router = useRouter();
  const [operaciones, setOperaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return router.push('/login');
      fetchOperaciones();
    });
    return () => unsubscribe();
  }, [router]);

  const fetchOperaciones = async () => {
    try {
      const q = query(collection(db, 'operaciones'), orderBy('fechaCreacion', 'desc'));
      const snapshot = await getDocs(q);
      setOperaciones(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error al cargar operaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await updateDoc(doc(db, 'operaciones', id), { estado: nuevoEstado });
      fetchOperaciones(); // Recargar para ver el cambio
    } catch (error) {
      alert("Error al actualizar el estado");
    }
  };

  // Helper para colores de estado
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE_FIRMA':
        return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">Pendiente Firma</span>;
      case 'APROBADA':
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200">Aprobada (Firma OK)</span>;
      case 'LIQUIDADA':
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">Liquidada / Pagada</span>;
      case 'RECHAZADA':
        return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold border border-red-200">Rechazada</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">{estado}</span>;
    }
  };

  if (loading) return <div className="p-10 text-center text-black">Cargando operaciones...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto text-black bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline de Operaciones</h1>
          <p className="text-sm text-gray-500">Seguimiento de créditos en curso</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-blue-600 hover:underline">
          &larr; Volver al Panel
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto / Cuotas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Actual</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {operaciones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No hay operaciones registradas. ¡Inicia una nueva simulación!</td>
                </tr>
              ) : (
                operaciones.map((op) => (
                  <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {op.fechaCreacion?.toDate().toLocaleDateString('es-AR') || 'Reciente'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{op.clienteNombre}</div>
                      <div className="text-xs text-gray-500">DNI: {op.clienteDni}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600">${op.montoSolicitado?.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{op.plazoCuotas}x ${(op.valorCuota || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(op.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <select 
                        className="border border-gray-300 rounded text-xs p-1 bg-white outline-none focus:border-blue-500"
                        value={op.estado}
                        onChange={(e) => cambiarEstado(op.id, e.target.value)}
                      >
                        <option value="PENDIENTE_FIRMA">Pendiente Firma</option>
                        <option value="APROBADA">Marcar Aprobada</option>
                        <option value="LIQUIDADA">Marcar Liquidada</option>
                        <option value="RECHAZADA">Rechazar</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
