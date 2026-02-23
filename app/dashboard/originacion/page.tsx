'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OriginacionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Datos del cliente y simulación
  const [dni, setDni] = useState('');
  const [monto, setMonto] = useState('');
  const [cuotas, setCuotas] = useState('12');
  
  // Datos simulados del CUAD
  const [cuadData, setCuadData] = useState<any>(null);

  const handleConsultarDni = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulamos el tiempo de respuesta del scraper CUAD (2 segundos)
    setTimeout(() => {
      setCuadData({
        nombre: 'JUAN PABLO PEREZ',
        reparticion: 'DGE - DOCENTES TITULARES',
        sueldoNeto: 850000,
        margenAfectable: 170000, // 20% del neto aprox
        score: 'Apto'
      });
      setLoading(false);
      setStep(2);
    }, 2000);
  };

  const calcularCuota = () => {
    const capital = parseFloat(monto);
    if (isNaN(capital)) return 0;
    const plazo = parseInt(cuotas);
    const tna = 1.20; // 120% TNA de ejemplo
    // Fórmula simple de interés para simular: (Capital * (1 + TNA * (plazo/12))) / plazo
    const totalPagar = capital * (1 + tna * (plazo / 12));
    return totalPagar / plazo;
  };

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

      <div className="bg-white p-8 shadow-lg rounded-xl border border-gray-100">
        
        {/* PASO 1: Ingreso de DNI */}
        {step === 1 && (
          <form onSubmit={handleConsultarDni} className="space-y-6 text-center max-w-sm mx-auto py-10">
            <div className="bg-blue-50 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Consultar Cliente</h2>
            <p className="text-sm text-gray-500">Ingresa el DNI para consultar en el sistema CUAD del Gobierno y BCRA.</p>
            
            <input 
              type="text" 
              required 
              placeholder="Ej: 30123456" 
              value={dni} 
              onChange={e => setDni(e.target.value.replace(/\D/g, ''))} // Solo números
              maxLength={8}
              className="w-full text-center text-2xl tracking-widest p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
            />
            
            <button 
              type="submit" 
              disabled={loading || dni.length < 7}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex justify-center items-center"
            >
              {loading ? (
                <><span className="animate-spin h-5 w-5 mr-3 border-t-2 border-white rounded-full"></span> Consultando Gobierno...</>
              ) : 'Verificar DNI'}
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
              {/* Controles de Simulación */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 border-b pb-2">Simulador</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto a solicitar ($)</label>
                  <input 
                    type="number" 
                    value={monto} 
                    onChange={e => setMonto(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-gray-50 text-lg" 
                    placeholder="Ej. 500000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan de Cuotas</label>
                  <select 
                    value={cuotas} 
                    onChange={e => setCuotas(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-gray-50 text-lg"
                  >
                    <option value="6">6 Cuotas</option>
                    <option value="12">12 Cuotas</option>
                    <option value="18">18 Cuotas</option>
                    <option value="24">24 Cuotas</option>
                  </select>
                </div>
              </div>

              {/* Resultados en vivo */}
              <div className="bg-gray-800 text-white p-6 rounded-xl flex flex-col justify-center space-y-4 shadow-inner">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Valor de Cuota Mensual</p>
                  <p className="text-4xl font-bold text-blue-400">
                    ${calcularCuota().toLocaleString(undefined, {maximumFractionDigits: 0})}
                  </p>
                </div>
                
                {calcularCuota() > cuadData.margenAfectable ? (
                  <div className="bg-red-500/20 text-red-300 p-2 rounded text-sm text-center border border-red-500/50">
                    ⚠️ La cuota supera el margen disponible en CUAD.
                  </div>
                ) : (
                  <div className="bg-green-500/20 text-green-300 p-2 rounded text-sm text-center border border-green-500/50">
                    ✅ Aprobación automática posible.
                  </div>
                )}
                
                <button 
                  disabled={!monto || calcularCuota() > cuadData.margenAfectable}
                  className="w-full bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 transition-colors mt-4"
                  onClick={() => alert("El siguiente paso será: Enviar link por WhatsApp para firma biométrica y generación de CAD.")}
                >
                  Continuar Originación &rarr;
                </button>
              </div>
            </div>
            
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-800 underline block text-center w-full">
              Volver a consultar DNI
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
