'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

export default function OperacionesPage() {
  const router = useRouter();
  const [operaciones, setOperaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push('/login');
      await loadProfileAndData(user.email);
    });
    return () => unsubscribe();
  }, [router]);

  const loadProfileAndData = async (email: string | null) => {
    if (!email) return;

    try {
      // 1. Buscamos el rol del usuario
      let role = 'SUPER_ADMIN';
      let entityId = null;

      const qUser = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const snapUser = await getDocs(qUser);
      
      if (!snapUser.empty) {
        const userData = snapUser.docs[0].data();
        role = userData.role;
        entityId = userData.entityId;
        setUserProfile(userData);
      }

      // 2. Traemos las operaciones según el rol
      let qOps;
      if (role === 'SUPER_ADMIN') {
        // Super Admin ve todo
        qOps = collection(db, 'operaciones');
      } else if (role === 'GERENTE_ENTIDAD') {
        // Gerente ve solo las de su entidad
        qOps = query(collection(db, 'operaciones'), where('entidadId', '==', entityId));
      } else {
        // Vendedor ve solo las que él originó
        qOps = query(collection(db, 'operaciones'), where('vendedorEmail', '==', email));
      }

      const querySnapshot = await getDocs(qOps);
      const ops = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenamos por fecha en memoria (las más nuevas primero)
      ops.sort((a: any, b: any) => {
          const dateA = a.fechaCreacion?.toMillis() || 0;
          const dateB = b.fechaCreacion?.toMillis() || 0;
          return dateB - dateA;
      });

      setOperaciones(ops);
    } catch (error) {
      console.error("Error cargando operaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLiquidar = async (operacionId: string) => {
    if (!confirm('¿Confirmas que se ha transferido el dinero al cliente y la operación está Liquidada?')) return;
    
    try {
      const docRef = doc(db, 'operaciones', operacionId);
      await updateDoc(docRef, { estado: 'LIQUIDADO' });
      
      // Actualizamos el estado local para no tener que recargar todo
      setOperaciones(ops => ops.map(op => op.id === operacionId ? { ...op, estado: 'LIQUIDADO' } : op));
      alert('Operación marcada como LIQUIDADA con éxito.');
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert('Error al liquidar la operación');
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE_FIRMA': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">Pendiente Firma</span>;
      case 'LISTO_PARA_LIQUIDAR': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse">Listo para Liquidar</span>;
      case 'LIQUIDADO': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">Liquidado</span>;
      case 'RECHAZADA': return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">Rechazada</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">{estado}</span>;
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando operaciones...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto text-black bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bandeja de Operaciones</h1>
          <p className="text-sm text-gray-500">Gestión de créditos y liquidaciones</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-blue-600 hover:underline">
          &larr; Volver al Panel
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Monto Solicitado</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cuotas</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {operaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No hay operaciones registradas aún.
                  </td>
                </tr>
              ) : (
                operaciones.map((op) => (
                  <tr key={op.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 whitespace-nowrap text-sm text-gray-500">
                      {op.fechaCreacion ? new Date(op.fechaCreacion.toMillis()).toLocaleDateString('es-AR') : 'Reciente'}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900 text-sm">{op.clienteNombre}</div>
                      <div className="text-xs text-gray-500">DNI: {op.clienteDni} | {op.entidadNombre}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">${op.montoSolicitado?.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Cuota: ${op.valorCuota?.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {op.plazoCuotas}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {getStatusBadge(op.estado)}
                    </td>
                    <td className="p-4 whitespace-nowrap text-center">
                      {/* Botón de Liquidar: Solo visible si está firmada */}
                      {op.estado === 'LISTO_PARA_LIQUIDAR' && (
                        <button 
                          onClick={() => handleLiquidar(op.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          Liquidar Crédito
                        </button>
                      )}
                      {op.estado === 'PENDIENTE_FIRMA' && (
                        <span className="text-xs text-gray-400 italic">Esperando firma...</span>
                      )}
                      {op.estado === 'LIQUIDADO' && (
                        <span className="text-xs text-green-600 font-bold flex items-center justify-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          Finalizado
                        </span>
                      )}
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
