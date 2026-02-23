'use client';

import { useEffect, useState, use } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function FirmaClientePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const [operacion, setOperacion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [firmando, setFirmando] = useState(false);
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [firmaExitosa, setFirmaExitosa] = useState(false);

  useEffect(() => {
    const fetchOperacion = async () => {
      try {
        const docRef = doc(db, 'operaciones', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setOperacion({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error al cargar la operación:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOperacion();
  }, [id]);

  const handleFirmar = async () => {
    if (!terminosAceptados) return;
    setFirmando(true);
    
    try {
      // Simulamos 2 segundos de proceso de "Firma Biométrica" o conexión con Renaper
      setTimeout(async () => {
        const docRef = doc(db, 'operaciones', id);
        await updateDoc(docRef, { 
          estado: 'APROBADA',
          fechaFirma: new Date().toISOString()
        });
        setFirmaExitosa(true);
        setFirmando(false);
      }, 2000);
      
    } catch (error) {
      console.error("Error al firmar:", error);
      alert("Hubo un error al procesar tu firma.");
      setFirmando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Cargando tu solicitud de crédito...</p>
      </div>
    );
  }

  if (!operacion) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 text-center">
        <div className="bg-red-100 text-red-600 p-4 rounded-full mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800">Enlace no válido</h1>
        <p className="text-gray-500 mt-2">Esta operación no existe o el enlace ha caducado.</p>
      </div>
    );
  }

  // Si ya fue firmada o procesada
  if (operacion.estado !== 'PENDIENTE_FIRMA' && !firmaExitosa) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 text-center">
        <div className="bg-blue-100 text-blue-600 p-4 rounded-full mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800">Operación Procesada</h1>
        <p className="text-gray-500 mt-2">Esta solicitud ya fue gestionada. Su estado actual es: <strong className="text-gray-800">{operacion.estado}</strong>.</p>
      </div>
    );
  }

  // Pantalla de Éxito
  if (firmaExitosa) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center p-6 text-center animate-fade-in-up">
        <div className="bg-green-100 text-green-600 p-6 rounded-full mb-6">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">¡Felicitaciones!</h1>
        <h2 className="text-xl font-bold text-gray-700 mb-6">{operacion.clienteNombre}</h2>
        <p className="text-gray-600 mb-8 max-w-sm">
          Has aceptado exitosamente tu crédito por <strong>${operacion.montoSolicitado?.toLocaleString()}</strong>. 
          En breve verás el dinero reflejado en tu cuenta sueldo de {operacion.reparticion}.
        </p>
        <div className="w-full max-w-sm bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Comprobante ID</p>
          <p className="font-mono text-sm text-gray-700">{operacion.id.toUpperCase()}</p>
        </div>
      </div>
    );
  }

  // Pantalla de Revisión y Firma
  return (
    <div className="min-h-screen bg-gray-50 text-black p-4 sm:p-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Cabecera */}
        <div className="bg-blue-600 p-6 text-center text-white">
          <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Solicitud de Crédito</p>
          <h1 className="text-2xl font-bold">PaySur</h1>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Hola,</p>
            <h2 className="text-xl font-bold text-gray-800">{operacion.clienteNombre}</h2>
            <p className="text-gray-500 text-sm mt-1">DNI: {operacion.clienteDni}</p>
          </div>

          <div className="border-t border-b border-gray-100 py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Monto Solicitado:</span>
              <span className="font-bold text-lg">${operacion.montoSolicitado?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Plan de Pagos:</span>
              <span className="font-bold">{operacion.plazoCuotas} cuotas fijas</span>
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
              <span className="text-blue-800 font-medium">Valor de la Cuota:</span>
              <span className="font-bold text-blue-700 text-lg">${(operacion.valorCuota || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800">
            <p className="font-medium mb-1">Descuento por Bono de Sueldo</p>
            <p className="text-xs">Al aceptar, autorizas a tu repartición ({operacion.reparticion}) a descontar el valor de la cuota mensualmente mediante código de descuento.</p>
          </div>

          <label className="flex items-start space-x-3 cursor-pointer p-2 border border-transparent hover:bg-gray-50 rounded-lg transition-colors">
            <input 
              type="checkbox" 
              checked={terminosAceptados}
              onChange={(e) => setTerminosAceptados(e.target.checked)}
              className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
            />
            <span className="text-sm text-gray-600 leading-relaxed">
              He leído y acepto los <a href="#" className="text-blue-600 underline">Términos y Condiciones</a>, la política de privacidad y autorizo la firma digital de este documento.
            </span>
          </label>

          <button 
            onClick={handleFirmar}
            disabled={!terminosAceptados || firmando}
            className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-lg disabled:shadow-none flex justify-center items-center"
          >
            {firmando ? (
              <><span className="animate-spin h-5 w-5 border-t-2 border-white rounded-full mr-2"></span> Procesando firma...</>
            ) : 'Aceptar y Firmar Crédito'}
          </button>
        </div>
        
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">Plataforma tecnológica impulsada por Simply Originación ©</p>
        </div>
      </div>
    </div>
  );
}
