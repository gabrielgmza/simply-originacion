'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

export default function OriginacionPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // NUEVO: Estados para Entidades y Parámetros
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');

  // Datos del cliente y simulación
  const [dni, setDni] = useState('');
  const [monto, setMonto] = useState('');
  const [cuotas, setCuotas] = useState('12');
  
  // Datos de la operación generada
  const [cuadData, setCuadData] = useState<any>(null);
  const [operacionId, setOperacionId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return router.push('/login');
      setCurrentUser(user);
      fetchEntities();
    });
    return () => unsubscribe();
  }, [router]);

  const fetchEntities = async () => {
    try {
      const snap = await getDocs(collection(db, 'entities'));
      const ents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntities(ents);
      if (ents.length > 0) setSelectedEntityId(ents[0].id); // Autoseleccionar la primera
    } catch (error) {
      console.error("Error cargando entidades:", error);
    }
  };

  const handleConsultarDni = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Llamamos a nuestro microservicio Backend
      const response = await fetch('/api/cuad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCuadData(result.data);
        setStep(2);
      } else {
        alert(result.error || 'Error al consultar DNI');
      }
    } catch (error) {
      alert('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // NUEVO: Motor de cálculo con parámetros reales de la Entidad
  const calcularCuota = () => {
    const capital = parseFloat(monto);
    if (isNaN(capital) || capital <= 0) return { cuota: 0, desglose: null };
    
    const plazo = parseInt(cuotas);
    const entidad = entities.find(e => e.id === selectedEntityId);
    
    // Si la entidad no tiene parámetros configurados, usamos valores por defecto
    const tna = (entidad?.parametros?.tna || 120) / 100;
    const gastosAdmin = entidad?.parametros?.gastosAdmin || 0;
    const seguroPorcentaje = (entidad?.parametros?.seguroVida || 0) / 100;

    // Fórmula: (Capital + Gastos) con interés TNA, más seguro mensual
    const capitalTotal = capital + gastosAdmin;
    const interesTotal = capitalTotal * (tna * (plazo / 12));
    const cuotaPura = (capitalTotal + interesTotal) / plazo;
    const costoSeguroMensual = capital * seguroPorcentaje;
    
    const cuotaFinal = cuotaPura + costoSeguroMensual;

    return { 
      cuota: cuotaFinal, 
      desglose: { capitalTotal, cuotaPura, costoSeguroMensual, gastosAdmin }
    };
  };

  const handleContinuar = async () => {
    setLoading(true);
    const { cuota } = calcularCuota();
    const entidadSeleccionada = entities.find(e => e.id === selectedEntityId);

    try {
      const operacionRef = await addDoc(collection(db, 'operaciones'), {
        entidadId: selectedEntityId,
        entidadNombre: entidadSeleccionada?.name || 'Genérica',
        clienteNombre: cuadData.nombre,
        clienteDni: dni,
        reparticion: cuadData.reparticion,
        montoSolicitado: parseFloat(monto),
        plazoCuotas: parseInt(cuotas),
        valorCuota: cuota,
        estado: 'PENDIENTE_FIRMA',
        vendedorEmail: currentUser?.email,
        fechaCreacion: serverTimestamp()
      });
      
      setOperacionId(operacionRef.id);
      setStep(3);
    } catch (error) {
      console.error("Error al guardar operación:", error);
      alert("Hubo un error al generar la operación.");
    } finally {
      setLoading(false);
    }
  };

  const generarLinkWhatsapp = () => {
    if (!cuadData || !operacionId) return '#';
    const { cuota } = calcularCuota();
    const cuotaStr = cuota.toLocaleString(undefined, {maximumFractionDigits: 0});
    const capitalStr = parseFloat(monto).toLocaleString();
    const linkFirma = `https://simply-originacion.vercel.app/firma/${operacionId}`; 
    const entidad = entities.find(e => e.id === selectedEntityId);
    
    const texto = `Hola *${cuadData.nombre}* 👋,\n\nTe escribo de *${entidad?.name || 'nuestra financiera'}*. Tu crédito por *$${capitalStr}* en ${cuotas} cuotas fijas de *$${cuotaStr}* está pre-aprobado.\n\nPara avanzar con el depósito, por favor ingresa a este link seguro para validar tu identidad y firmar la solicitud:\n👉 ${linkFirma}\n\nCualquier duda, estoy a disposición.`;
    
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  };

  const simulacion = calcularCuota();

  return (
    <div className="p-8 max-w-4xl mx-auto text-black bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Nueva Operación</h1>
          <p className="text-sm text-gray-500">Simulador y Originación de Crédito</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-blue-600 hover:underline">
          &larr; Volver al Panel
        </button>
      </div>

      <div className="bg-white p-8 shadow-lg rounded-xl border border-gray-100 min-h-[400px]">
        
        {/* PASO 1: Ingreso de DNI */}
        {step === 1 && (
          <form onSubmit={handleConsultarDni} className="space-y-6 text-center max-w-sm mx-auto py-6 animate-fade-in-up">
            
            {/* Selector de Entidad (Visible solo si hay más de 1 o para confirmar) */}
            <div className="text-left mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">1. Seleccionar Entidad Originadora</label>
              <select 
                value={selectedEntityId} 
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="w-full p-3 border-2 border-blue-100 rounded-lg bg-blue-50 text-blue-900 font-medium focus:outline-none focus:border-blue-500"
              >
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">2. Consultar Cliente</h2>
            <p className="text-sm text-gray-500">Ingresa el DNI para consultar en el sistema CUAD.</p>
            
            <input type="text" required placeholder="Ej: 30123456" value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} maxLength={8}
              className="w-full text-center text-2xl tracking-widest p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors" />
            
            <button type="submit" disabled={loading || dni.length < 7 || !selectedEntityId} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex justify-center items-center">
              {loading ? <><span className="animate-spin h-5 w-5 mr-3 border-t-2 border-white rounded-full"></span> Consultando...</> : 'Verificar DNI'}
            </button>
          </form>
        )}

        {/* PASO 2: Simulación y Resultados CUAD */}
        {step === 2 && cuadData && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 flex justify-between items-center rounded-r-lg">
              <div>
                <p className="text-sm text-green-800 font-bold uppercase">{cuadData.nombre}</p>
                <p className="text-xs text-green-600">{cuadData.reparticion} | DNI: {dni}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600 uppercase font-bold">Margen Disponible</p>
                <p className="text-2xl font-black text-green-700">${cuadData.margenAfectable.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 border-b pb-2">
                  Simulador <span className="text-blue-600 text-sm font-normal">({entities.find(e => e.id === selectedEntityId)?.name})</span>
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto a solicitar ($)</label>
                  <input type="number" value={monto} onChange={e => setMonto(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 text-lg" placeholder="Ej. 500000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan de Cuotas</label>
                  <select value={cuotas} onChange={e => setCuotas(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 text-lg">
                    <option value="6">6 Cuotas</option><option value="12">12 Cuotas</option><option value="18">18 Cuotas</option><option value="24">24 Cuotas</option>
                  </select>
                </div>

                {/* Desglose de Gastos (Opcional visualmente) */}
                {simulacion.desglose && monto && (
                  <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 border border-gray-200">
                    <p className="flex justify-between"><span>Gastos Adm.:</span> <span>${simulacion.desglose.gastosAdmin.toLocaleString()}</span></p>
                    <p className="flex justify-between"><span>Seguro de Vida (mensual):</span> <span>${simulacion.desglose.costoSeguroMensual.toLocaleString(undefined, {maximumFractionDigits:0})}</span></p>
                  </div>
                )}
              </div>

              <div className="bg-gray-800 text-white p-6 rounded-xl flex flex-col justify-center space-y-4 shadow-inner">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Valor de Cuota Mensual</p>
                  <p className="text-4xl font-bold text-blue-400">${simulacion.cuota.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                </div>
                
                {simulacion.cuota > cuadData.margenAfectable ? (
                  <div className="bg-red-500/20 text-red-300 p-2 rounded text-sm text-center border border-red-500/50">⚠️ Cuota supera margen disponible.</div>
                ) : (
                  <div className="bg-green-500/20 text-green-300 p-2 rounded text-sm text-center border border-green-500/50">✅ Aprobación automática.</div>
                )}
                
                <button 
                  disabled={!monto || simulacion.cuota > cuadData.margenAfectable || loading}
                  className="w-full bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 transition-colors mt-4 flex justify-center items-center"
                  onClick={handleContinuar}
                >
                  {loading ? <span className="animate-spin h-5 w-5 border-t-2 border-white rounded-full"></span> : 'Generar Operación →'}
                </button>
              </div>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-800 underline block text-center w-full">Volver a consultar DNI</button>
          </div>
        )}

        {/* PASO 3: Éxito y Link de WhatsApp */}
        {step === 3 && operacionId && (
          <div className="space-y-6 animate-fade-in-up text-center py-4">
            <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-2">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">¡Operación Creada!</h2>
            <p className="text-gray-500 text-sm">Financiera: <strong>{entities.find(e => e.id === selectedEntityId)?.name}</strong></p>
            
            <div className="bg-gray-50 rounded-lg p-5 text-left max-w-sm mx-auto border border-gray-200 mt-4">
              <p className="flex justify-between text-sm mb-2"><span className="text-gray-500">Cliente:</span> <span className="font-bold">{cuadData?.nombre}</span></p>
              <p className="flex justify-between text-sm mb-2"><span className="text-gray-500">Capital:</span> <span className="font-bold">${parseFloat(monto).toLocaleString()}</span></p>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <p className="flex justify-between text-sm"><span className="text-gray-600 font-bold">Cuota:</span> <span className="font-bold text-blue-600">{cuotas} cuotas de ${simulacion.cuota.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></p>
              </div>
            </div>

            <div className="max-w-sm mx-auto space-y-3 pt-4">
              <a href={generarLinkWhatsapp()} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center bg-[#25D366] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#128C7E] transition-colors shadow-md">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.425-10.416c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 14.5c-1.144 0-2.261-.303-3.242-.876l-3.605.946.963-3.513c-.636-1.015-.97-2.193-.97-3.407 0-3.584 2.916-6.5 6.5-6.5s6.5 2.916 6.5 6.5-2.916 6.5-6.5 6.5z"/></svg>
                Enviar Link a Cliente
              </a>
              <button onClick={() => { setStep(1); setDni(''); setMonto(''); setCuadData(null); }} className="w-full text-blue-600 font-medium hover:underline transition-colors mt-2 text-sm">
                Nueva Consulta DNI
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
