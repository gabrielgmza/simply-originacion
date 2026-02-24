'use client';

import { useEffect, useState, use } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function FirmaDigitalPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const [operacion, setOperacion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [firma, setFirma] = useState('');
  
  // NUEVO: Datos Bancarios del Cliente
  const [cbu, setCbu] = useState('');
  const [banco, setBanco] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadOperacion = async () => {
      try {
        const docRef = doc(db, 'operaciones', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOperacion({ id: docSnap.id, ...docSnap.data() });
          if (docSnap.data().estado !== 'PENDIENTE_FIRMA') {
            setStep(4);
          }
        } else {
          setOperacion(null);
        }
      } catch (error) {
        console.error("Error al cargar:", error);
      } finally {
        setLoading(false);
      }
    };
    loadOperacion();
  }, [id]);

  const handleFirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firma || firma.length < 3) return alert('Debes escribir tu nombre completo como firma.');
    if (!cbu || cbu.length < 5) return alert('Debes ingresar un CBU o Alias válido.');
    
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'operaciones', id);
      await updateDoc(docRef, {
        estado: 'LISTO_PARA_LIQUIDAR',
        datosBancarios: {
          cbuAlias: cbu,
          bancoDestino: banco
        },
        firmaDigital: {
          nombre: firma,
          fecha: new Date().toISOString(),
          ip: 'Registrada', 
          userAgent: navigator.userAgent
        }
      });
      setStep(3); 
    } catch (error) {
      console.error("Error al firmar:", error);
      alert('Hubo un error al procesar tu firma.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full"></div></div>;
  if (!operacion) return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center"><p className="text-xl font-bold text-gray-700">Operación no encontrada o enlace vencido.</p></div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">{operacion.entidadNombre}</h2>
          <p className="mt-2 text-sm text-gray-500">Solicitud de Crédito Pre-Aprobada</p>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Detalles de tu crédito</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Titular:</dt><dd className="font-semibold text-gray-900">{operacion.clienteNombre}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">DNI:</dt><dd className="font-semibold text-gray-900">{operacion.clienteDni}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Capital Solicitado:</dt><dd className="font-semibold text-gray-900">${operacion.montoSolicitado.toLocaleString()}</dd></div>
                <div className="flex justify-between pt-3 border-t"><dt className="text-gray-800 font-bold">Plan de Pago:</dt><dd className="font-black text-blue-600 text-base">{operacion.plazoCuotas} cuotas de ${operacion.valorCuota.toLocaleString(undefined, {maximumFractionDigits:0})}</dd></div>
              </dl>
            </div>
            
            <button onClick={() => setStep(2)} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors">
              Validar Identidad y Firmar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-700">Para recibir los fondos, ingresa tu cuenta bancaria y firma la solicitud.</p>
            </div>
            
            <form onSubmit={handleFirmar} className="space-y-4">
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <h4 className="font-bold text-sm text-gray-700">Datos de Transferencia</h4>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">CBU / CVU / Alias</label>
                    <input required type="text" value={cbu} onChange={e => setCbu(e.target.value)} placeholder="Ej. jperez.banco"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Banco (Opcional)</label>
                    <input type="text" value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ej. Banco Galicia"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Firma Electrónica (Tu nombre completo)</label>
                <input required type="text" value={firma} onChange={e => setFirma(e.target.value)} placeholder={`Ej. ${operacion.clienteNombre}`}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Volver</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors disabled:bg-green-400 flex justify-center items-center">
                  {isSubmitting ? <span className="animate-spin h-4 w-4 border-t-2 border-white rounded-full"></span> : 'Firmar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4 animate-fade-in-up py-6">
            <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">¡Solicitud Firmada!</h2>
            <p className="text-gray-500 text-sm">El crédito está en proceso de liquidación. Los fondos serán transferidos al CBU indicado a la brevedad.</p>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-4 animate-fade-in-up py-6">
            <h2 className="text-xl font-bold text-gray-900">Enlace no válido</h2>
            <p className="text-gray-500 text-sm">Esta solicitud ya fue firmada anteriormente.</p>
          </div>
        )}

      </div>
    </div>
  );
}
