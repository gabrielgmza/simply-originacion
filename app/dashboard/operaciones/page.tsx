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

      let qOps;
      if (role === 'SUPER_ADMIN') {
        qOps = collection(db, 'operaciones');
      } else if (role === 'GERENTE_ENTIDAD') {
        qOps = query(collection(db, 'operaciones'), where('entidadId', '==', entityId));
      } else {
        qOps = query(collection(db, 'operaciones'), where('vendedorEmail', '==', email));
      }

      const querySnapshot = await getDocs(qOps);
      const ops = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
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

  const handleLiquidar = async (op: any) => {
    const cbuInfo = op.datosBancarios ? `\n\nCBU/Alias: ${op.datosBancarios.cbuAlias}\nBanco: ${op.datosBancarios.bancoDestino || 'No especificado'}` : '\n\n(No hay CBU registrado)';
    if (!confirm(`¿Confirmas la transferencia de $${op.montoSolicitado.toLocaleString()} a ${op.clienteNombre}? ${cbuInfo}`)) return;
    
    try {
      const docRef = doc(db, 'operaciones', op.id);
      await updateDoc(docRef, { estado: 'LIQUIDADO' });
      setOperaciones(ops => ops.map(o => o.id === op.id ? { ...o, estado: 'LIQUIDADO' } : o));
      alert('Operación marcada como LIQUIDADA con éxito.');
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert('Error al liquidar la operación');
    }
  };

  const exportarCSV = () => {
    const headers = ['Fecha', 'Financiera', 'Cliente', 'DNI', 'Monto', 'Cuotas', 'Valor Cuota', 'CBU/Alias', 'Banco', 'Estado'];
    const rows = operaciones.map(op => {
      const fecha = op.fechaCreacion ? new Date(op.fechaCreacion.toMillis()).toLocaleDateString('es-AR') : '';
      return [fecha, op.entidadNombre, op.clienteNombre, op.clienteDni, op.montoSolicitado, op.plazoCuotas, op.valorCuota, op.datosBancarios?.cbuAlias || '', op.datosBancarios?.bancoDestino || '', op.estado].map(field => `"${field}"`).join(','); 
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `operaciones_simply_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // NUEVO: Función nativa para imprimir a PDF
  const exportarPDF = () => {
    window.print();
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
    <div className="p-8 max-w-7xl mx-auto text-black bg-gray-50 min-h-screen print:bg-white print:p-0">
      <div className="flex justify-between items-center mb-8 print:mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bandeja de Operaciones</h1>
          <p className="text-sm text-gray-500 print:hidden">Gestión de créditos y liquidaciones</p>
        </div>
        
        {/* Usamos print:hidden para que estos botones NO salgan en el PDF */}
        <div className="flex space-x-3 print:hidden">
          <button onClick={exportarPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center text-sm shadow-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            PDF
          </button>
          <button onClick={exportarCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center text-sm shadow-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Excel
          </button>
          <button onClick={() => router.push('/dashboard')} className="text-blue-600 hover:underline flex items-center text-sm ml-2">
            &larr; Volver
          </button>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-xl border border-gray-100 overflow-hidden print:shadow-none print:border-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 print:bg-gray-100">
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha / Entidad</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Crédito</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center print:hidden">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {operaciones.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay operaciones registradas.</td></tr>
              ) : (
                operaciones.map((op) => (
                  <tr key={op.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{op.fechaCreacion ? new Date(op.fechaCreacion.toMillis()).toLocaleDateString('es-AR') : 'Reciente'}</div>
                      <div className="text-xs text-blue-600 font-bold">{op.entidadNombre}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900 text-sm">{op.clienteNombre}</div>
                      <div className="text-xs text-gray-500">DNI: {op.clienteDni}</div>
                      {op.datosBancarios && (
                        <div className="text-[10px] mt-1 bg-gray-100 inline-block px-2 py-1 rounded text-gray-600 font-mono">
                          CBU: {op.datosBancarios.cbuAlias}
                        </div>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">${op.montoSolicitado?.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{op.plazoCuotas} cuotas de ${op.valorCuota?.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {getStatusBadge(op.estado)}
                    </td>
                    {/* Ocultamos la columna de acciones en el PDF */}
                    <td className="p-4 whitespace-nowrap text-center print:hidden">
                      {op.estado === 'LISTO_PARA_LIQUIDAR' && (
                        <button onClick={() => handleLiquidar(op)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm">
                          Liquidar
                        </button>
                      )}
                      {op.estado === 'PENDIENTE_FIRMA' && <span className="text-xs text-gray-400 italic">Esperando...</span>}
                      {op.estado === 'LIQUIDADO' && <span className="text-xs text-green-600 font-bold">Finalizado</span>}
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
