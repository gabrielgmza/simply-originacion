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
  
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');

  const [dni, setDni] = useState('');
  const [monto, setMonto] = useState('');
  const [cuotas, setCuotas] = useState('12');
  
  const [cuadData, setCuadData] = useState<any>(null);
  const [bcraData, setBcraData] = useState<any>(null);
  
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
      if (ents.length > 0) {
        setSelectedEntityId(ents[0].id);
        // Autoseleccionar la primera cuota disponible de la entidad
        const plazos = ents[0].parametros?.plazos?.split(',') || ['12'];
        setCuotas(plazos[0].trim());
      }
    } catch (error) {
      console.error("Error cargando entidades:", error);
    }
  };

  const handleEntityChange = (e: any) => {
    const newId = e.target.value;
    setSelectedEntityId(newId);
    const ent = entities.find(x => x.id === newId);
    if (ent && ent.parametros?.plazos) {
        const plazos = ent.parametros.plazos.split(',');
        setCuotas(plazos[0].trim()); // Reseteamos la cuota al cambiar de financiera
    }
  };

  const handleConsultarDni = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const [cuadRes, bcraRes] = await Promise.all([
        fetch('/api/cuad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dni }) }),
        fetch('/api/bcra', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dni }) })
      ]);
      
      const cuadResult = await cuadRes.json();
      const bcraResult = await bcraRes.json();
      
      if (cuadResult.success && bcraResult.success) {
        setCuadData(cuadResult.data);
        setBcraData(bcraResult.data);
        setStep(2);
      } else {
        alert('Error al consultar bases gubernamentales/BCRA');
      }
    } catch (error) {
      alert('Error de conexión con los servidores.');
    } finally {
      setLoading(false);
    }
  };

  const calcularCuota = () => {
    const capitalSolicitado = parseFloat(monto);
    if (isNaN(capitalSolicitado) || capitalSolicitado <= 0) return { cuota: 0, desglose: null };
    
    const plazo = parseInt(cuotas) || 12;
    const entidad = entities.find(e => e.id === selectedEntityId);
    const p = entidad?.parametros || {};
    
    // Extracción de variables dinámicas porcentuales
    const tna = (p.tna || 120) / 100;
    const gastosAdminPct = (p.gastosAdminPct || 0) / 100;
    const gastosOtorgPct = (p.gastosOtorgamientoPct || 0) / 100;
    const seguroVidaPct = (p.seguroVida || 0) / 100;
    const feeFijo = p.feeFijo || 0;

    // Cálculo matemático: Los gastos se suman al capital a financiar
    const montoGastosAdmin = capitalSolicitado * gastosAdminPct;
    const montoGastosOtorg = capitalSolicitado * gastosOtorgPct;
    const capitalTotalFinanciado = capitalSolicitado + montoGastosAdmin + montoGastosOtorg + feeFijo;
    
    // Interés Simple (Base para el MVP, luego se puede pasar a Sistema Francés)
    const interesTotal = capitalTotalFinanciado * (tna * (plazo / 12));
    const cuotaPura = (capitalTotalFinanciado + interesTotal) / plazo;
    
    // El seguro de vida suele calcularse sobre saldo deudor o capital inicial por mes
    const costoSeguroMensual = capitalSolicitado * seguroVidaPct; 
    
    const cuotaFinal = cuotaPura + costoSeguroMensual;

    return { 
      cuota: cuotaFinal, 
      desglose: { 
        capitalSolicitado, 
        capitalTotalFinanciado, 
        montoGastosAdmin, 
        montoGastosOtorg, 
        feeFijo,
        costoSeguroMensual 
      }
    };
  };

  const handleContinuar = async () => {
    setLoading(true);
    const { cuota, desglose } = calcularCuota();
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
        desgloseEstructura: desglose, // Guardamos la estructura de costos históricos
        estado: 'PENDIENTE_FIRMA',
        vendedorEmail: currentUser?.email,
        riesgoBcra: bcraData,
        fechaCreacion: serverTimestamp()
      });
      
      setOperacionId(operacionRef.id);
      setStep(3);
    } catch (error) {
      console.error("Error al guardar:", error);
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
    
    const texto = `Hola *${cuadData.nombre}* 👋,\n\nTe escribo de *${entidad?.name || 'nuestra financiera'}*. Tu crédito por *$${capitalStr}* en ${cuotas} cuotas fijas de *$${cuotaStr}* está pre-aprobado.\n\nPara avanzar, ingresa a este link seguro para firmar la solicitud:\n👉 ${linkFirma}`;
    
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  };

  const simulacion = calcularCuota();
  const entidadActiva = entities.find(e => e.id === selectedEntityId);
  const plazosDisponibles = entidadActiva?.parametros?.plazos?.split(',') || ['6', '12', '18', '24'];

  return (
    <div className="max-w-5xl mx-auto text-black bg-gray-50 min-h-screen animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Nueva Operación</h1>
          <p className="text-sm text-gray-500">Simulador y Motor de Riesgo Dual</p>
        </div>
      </div>

      <div className="bg-white p-8 shadow-lg rounded-xl border border-gray-100 min-h-[400px]">
        
        {step === 1 && (
          <form onSubmit={handleConsultarDni} className="space-y-6 text-center max-w-sm mx-auto py-6">
            <div className="text-left mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">1. Seleccionar Entidad</label>
              <select value={selectedEntityId} onChange={handleEntityChange} className="w-full p-3 border-2 border-blue-100 rounded-lg bg-blue-50 text-blue-900 font-medium focus:outline-none focus:border-blue-500">
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="bg-blue-50 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">2. Motor de Evaluación</h2>
            <input type="text" required placeholder="Ej: 30123456" value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} maxLength={8} className="w-full text-center text-2xl tracking-widest p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none" />
            <button type="submit" disabled={loading || dni.length < 7 || !selectedEntityId} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex justify-center items-center">
              {loading ? <span className="animate-spin h-5 w-5 mr-3 border-t-2 border-white rounded-full"></span> : 'Iniciar Evaluación Dual'}
            </button>
          </form>
        )}

        {step === 2 && cuadData && bcraData && (
          <div className="space-y-8 animate-fade-in-up">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tarjeta CUAD */}
              <div className="bg-green-50 border-l-4 border-green-500 p-4 flex flex-col justify-center rounded-r-lg">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-green-600 uppercase font-black">CUAD - Gobierno</p>
                </div>
                <p className="text-sm text-green-900 font-bold uppercase truncate">{cuadData.nombre}</p>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-green-800 font-medium">Margen Disponible</p>
                  <p className="text-3xl font-black text-green-700">${cuadData.margenAfectable.toLocaleString()}</p>
                </div>
              </div>
              {/* Tarjeta BCRA */}
              <div className={`border-l-4 p-4 flex flex-col justify-center rounded-r-lg ${bcraData.apto ? 'bg-blue-50 border-blue-500' : 'bg-red-50 border-red-500'}`}>
                <div className="flex items-center justify-between mb-2">
                    <p className={`text-xs uppercase font-black ${bcraData.apto ? 'text-blue-600' : 'text-red-600'}`}>BCRA - Central de Deudores</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${bcraData.apto ? 'bg-blue-600' : 'bg-red-600'}`}>Sit. {bcraData.situacion}</span>
                </div>
                <p className={`text-sm font-bold uppercase ${bcraData.apto ? 'text-blue-900' : 'text-red-900'}`}>{bcraData.descripcion}</p>
                <div className={`mt-3 pt-3 border-t ${bcraData.apto ? 'border-blue-200' : 'border-red-200'}`}>
                  <p className={`text-xs font-medium ${bcraData.apto ? 'text-blue-800' : 'text-red-800'}`}>Deuda Total Declarada</p>
                  <p className={`text-3xl font-black ${bcraData.apto ? 'text-blue-700' : 'text-red-700'}`}>${bcraData.deudaTotal.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 pb-2 flex justify-between items-center">
                  Simulador 
                  <span className="text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded border border-blue-100">{entidadActiva?.name} - TNA {entidadActiva?.parametros?.tna}%</span>
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capital a solicitar ($)</label>
                  <input type="number" value={monto} onChange={e => setMonto(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 text-lg font-semibold" placeholder="Ej. 500000" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan de Cuotas</label>
                  <select value={cuotas} onChange={e => setCuotas(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 text-lg font-semibold">
                    {plazosDisponibles.map((p: string) => (
                      <option key={p} value={p.trim()}>{p.trim()} Cuotas Fijas</option>
                    ))}
                  </select>
                </div>

                {simulacion.desglose && parseFloat(monto) > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600 border border-gray-200 space-y-1">
                    <p className="flex justify-between font-bold text-gray-800 border-b pb-1 mb-1"><span>Desglose de Cargos</span></p>
                    <p className="flex justify-between"><span>Gastos Admin. ({entidadActiva?.parametros?.gastosAdminPct}%):</span> <span>${simulacion.desglose.montoGastosAdmin.toLocaleString()}</span></p>
                    <p className="flex justify-between"><span>Gastos Otorg. ({entidadActiva?.parametros?.gastosOtorgamientoPct}%):</span> <span>${simulacion.desglose.montoGastosOtorg.toLocaleString()}</span></p>
                    {simulacion.desglose.feeFijo > 0 && <p className="flex justify-between"><span>Fee Fijo:</span> <span>${simulacion.desglose.feeFijo.toLocaleString()}</span></p>}
                    <p className="flex justify-between pt-1 font-semibold text-gray-700"><span>Capital Financiado:</span> <span>${simulacion.desglose.capitalTotalFinanciado.toLocaleString()}</span></p>
                    <p className="flex justify-between text-blue-600 mt-2"><span>Seguro Vida (Mensual):</span> <span>+ ${simulacion.desglose.costoSeguroMensual.toLocaleString(undefined, {maximumFractionDigits:0})}</span></p>
                  </div>
                )}
              </div>

              <div className="bg-gray-800 text-white p-6 rounded-xl flex flex-col justify-center space-y-4 shadow-inner">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Valor de Cuota Mensual Final</p>
                  <p className="text-5xl font-bold text-blue-400">${simulacion.cuota.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  <p className="text-xs text-gray-500 mt-2">CFT {entidadActiva?.parametros?.cft}% | TEA {entidadActiva?.parametros?.tea}%</p>
                </div>
                
                {!bcraData.apto ? (
                  <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-sm text-center border border-red-500/50">
                      <strong>BLOQUEADO POR RIESGO (SIT. {bcraData.situacion})</strong>
                  </div>
                ) : simulacion.cuota > cuadData.margenAfectable ? (
                  <div className="bg-yellow-500/20 text-yellow-300 p-3 rounded-lg text-sm text-center border border-yellow-500/50">
                      ⚠️ La cuota supera el margen disponible.
                  </div>
                ) : (
                  <div className="bg-green-500/20 text-green-300 p-3 rounded-lg text-sm text-center border border-green-500/50">
                      ✅ Aprobación automática. Margen y Riesgo OK.
                  </div>
                )}
                
                <button 
                  disabled={!monto || simulacion.cuota > cuadData.margenAfectable || loading || !bcraData.apto}
                  className="w-full bg-blue-600 py-4 rounded-lg font-bold hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors mt-4 text-lg"
                  onClick={handleContinuar}
                >
                  {loading ? 'Procesando...' : 'Generar Operación →'}
                </button>
              </div>
            </div>
            <button onClick={() => {setStep(1); setCuadData(null); setBcraData(null);}} className="text-sm text-gray-500 hover:text-gray-800 underline block text-center w-full pt-4">Volver a consultar otro DNI</button>
          </div>
        )}

        {step === 3 && operacionId && (
          <div className="space-y-6 animate-fade-in-up text-center py-4">
            <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-2">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">¡Operación Creada!</h2>
            <div className="max-w-sm mx-auto space-y-3 pt-4">
              <a href={generarLinkWhatsapp()} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center bg-[#25D366] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#128C7E] shadow-md">
                Enviar Link a Cliente
              </a>
              <button onClick={() => { setStep(1); setDni(''); setMonto(''); setCuadData(null); setBcraData(null); }} className="w-full text-blue-600 font-medium hover:underline text-sm pt-2">
                Nueva Consulta DNI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
