'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { jsPDF } from 'jspdf';

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

  // NUEVO: Motor generador de PDFs (Contratos)
  const generarPDF = (op: any) => {
    const doc = new jsPDF();
    
    // --- CABECERA ---
    doc.setFillColor(37, 99, 235); // Azul corporativo
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("PaySur", 20, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("DOCUMENTO VINCULANTE - CÓDIGO DE DESCUENTO", 190, 20, { align: "right" });
    
    // --- CUERPO LEGAL ---
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PAGARÉ SIN PROTESTO Y AUTORIZACIÓN DE DESCUENTO", 105, 50, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    const fecha = op.fechaFirma ? new Date(op.fechaFirma).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');
    
    doc.text(`Fecha de emisión: ${fecha}`, 20, 70);
    doc.text(`Lugar: Mendoza, Argentina`, 20, 77);
    doc.text(`Monto del crédito: $${op.montoSolicitado?.toLocaleString()}`, 20, 84);
    
    const textoLegal = `Por el presente PAGARÉ, yo ${op.clienteNombre}, titular del DNI Nº ${op.clienteDni}, me comprometo incondicionalmente a pagar a la orden de PaySur o a quien represente sus derechos, la cantidad de PESOS ${op.montoSolicitado?.toLocaleString()}, que serán abonados en ${op.plazoCuotas} cuotas mensuales, iguales y consecutivas de PESOS ${(op.valorCuota || 0).toLocaleString(undefined, {maximumFractionDigits:0})}.`;
    
    const splitTexto = doc.splitTextToSize(textoLegal, 170);
    doc.text(splitTexto, 20, 100);
    
    const textoAutorizacion = `Asimismo, en mi carácter de empleado/a de ${op.reparticion}, AUTORIZO expresamente a mi empleador a retener de mis haberes mensuales (mediante Código de Descuento) el importe correspondiente a las cuotas aquí acordadas, para ser transferidas a PaySur hasta la cancelación total de la deuda contraída.`;
    
    const splitAutorizacion = doc.splitTextToSize(textoAutorizacion, 170);
    doc.text(splitAutorizacion, 20, 130);
    
    // --- BLOQUE DE FIRMA DIGITAL ---
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(249, 250, 251);
    doc.rect(20, 160, 170, 45, 'FD');
    
    doc.setFont("helvetica", "bold");
    doc.text("FIRMA DIGITAL Y ACEPTACIÓN DE TÉRMINOS", 25, 170);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`El cliente ha aceptado los términos y condiciones de forma electrónica.`, 25, 180);
    doc.text(`Fecha y hora de firma: ${op.fechaFirma ? new Date(op.fechaFirma).toLocaleString('es-AR') : 'Pendiente'}`, 25, 187);
    doc.text(`ID de Operación / Hash: ${op.id}`, 25, 194);
    
    if (op.estado === 'APROBADA' || op.estado === 'LIQUIDADA') {
      doc.setTextColor(22, 163, 74); // Verde
      doc.text(`Estado de validación: FIRMA VERIFICADA Y APROBADA`, 25, 201);
    } else {
      doc.setTextColor(220, 38, 38); // Rojo
      doc.text(`Estado de validación: PENDIENTE DE FIRMA`, 25, 201);
    }
    
    // --- PIE DE PÁGINA ---
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text("Documento generado automáticamente por Simply Originación ©", 105, 280, { align: "center" });
    
    // Descargar el archivo
    doc.save(`Contrato_PaySur_${op.clienteDni}.pdf`);
  };

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
          <p className="text-sm text-gray-500">Seguimiento de créditos y documentación</p>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones y Documentos</th>
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
                    <td className="px-6 py-4 whitespace-nowrap flex flex-col items-end space-y-2">
                      <select 
                        className="border border-gray-300 rounded text-xs p-1 bg-white outline-none focus:border-blue-500 cursor-pointer"
                        value={op.estado}
                        onChange={(e) => cambiarEstado(op.id, e.target.value)}
                      >
                        <option value="PENDIENTE_FIRMA">Pendiente Firma</option>
                        <option value="APROBADA">Marcar Aprobada</option>
                        <option value="LIQUIDADA">Marcar Liquidada</option>
                        <option value="RECHAZADA">Rechazar</option>
                      </select>
                      
                      {/* Botón Mágico de Descarga PDF */}
                      {(op.estado === 'APROBADA' || op.estado === 'LIQUIDADA') && (
                        <button 
                          onClick={() => generarPDF(op)}
                          className="flex items-center text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                          Descargar Contrato
                        </button>
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
