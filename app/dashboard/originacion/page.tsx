'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
// Usamos el alias @ para evitar errores de ruta relativa profunda
import { auth, db } from '@/lib/firebase';

// COMPONENTE TOAST (Notificaciones Flotantes de Alto Contraste)
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-[100] flex items-center p-5 min-w-[350px] rounded-3xl shadow-2xl animate-in slide-in-from-right-full duration-300 border-2 ${
      type === 'success' ? 'bg-emerald-700 border-emerald-400' : 'bg-rose-700 border-rose-400'
    } text-white`}>
      <div className="flex items-center space-x-4 w-full">
        <div className="bg-white/20 p-2 rounded-2xl shadow-inner">
          {type === 'success' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          )}
        </div>
        <p className="font-black text-sm uppercase tracking-tight flex-1">{message}</p>
        <button onClick={onClose} className="text-white/70 hover:text-white font-bold text-xl ml-2 transition-opacity">✕</button>
      </div>
    </div>
  );
};

export default function App() {
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
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

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
      if (ents.length > 0) setSelectedEntityId(ents[0].id);
    } catch (e) {
      setToast({ message: "Error conectando con la base de datos", type: "error" });
    }
  };

  /**
   * INGENIERÍA BANCARIA: MULTI-SISTEMA (Francés, Alemán, Mixto)
   */
  const calcularSimulacion = () => {
    const principal = parseFloat(monto) || 0;
    if (principal <= 0) return null;

    const n = parseInt(cuotas) || 12;
    const ent = entities.find(e => e.id === selectedEntityId);
    const p = ent?.parametros || {};
    const sistema = p.sistemaAmortizacion || 'FRANCES';

    const tna = (p.tna || 120) / 100;
    const i = tna / 12; // Tasa Efectiva Mensual

    const gastosAdmin = principal * ((p.gastosAdminPct || 0) / 100);
    const gastosOtorg = principal * ((p.gastosOtorgamientoPct || 0) / 100);
    const capitalFinanciado = principal + gastosAdmin;
    const seguroVida = principal * ((p.seguroVida || 0) / 100);

    let cuotaAmortizada = 0;

    if (sistema === 'ALEMAN') {
      // Alemán: Capital constante, cuota decreciente. Mostramos la primera cuota.
      cuotaAmortizada = (capitalFinanciado / n) + (capitalFinanciado * i);
    } else if (sistema === 'MIXTO') {
      // Mixto: Promedio entre Francés y Alemán
      const f = (capitalFinanciado * i) / (1 - Math.pow(1 + i, -n));
      const a = (capitalFinanciado / n) + (capitalFinanciado * i);
      cuotaAmortizada = (f + a) / 2;
    } else {
      // Francés: Cuota constante (Anualidad)
      cuotaAmortizada = (capitalFinanciado * i) / (1 - Math.pow(1 + i, -n));
    }

    const cuotaFinal = cuotaAmortizada + seguroVida;
    const montoLiquido = principal - gastosOtorg;

    // Cálculos de tasas para transparencia
    const tea = (Math.pow(1 + i, 12) - 1) * 100;
    const cft = (Math.pow((cuotaFinal * n) / montoLiquido, 1 / (n / 12)) - 1) * 100;

    return { cuota: cuotaFinal, tea, cft, sistema, neto: montoLiquido };
  };

  const sim = calcularSimulacion();

  const handleConsultarDni = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        fetch('/api/cuad', { method: 'POST', body: JSON.stringify({ dni }) }),
        fetch('/api/bcra', { method: 'POST', body: JSON.stringify({ dni }) })
      ]);
      const d1 = await res1.json();
      const d2 = await res2.json();
      if (d1.success && d2.success) {
        setCuadData(d1.data);
        setBcraData(d2.data);
        setStep(2);
        setToast({ message: "Análisis de riesgo completado", type: "success" });
      }
    } catch (e) {
      setToast({ message: "Error en servidores externos", type: "error" });
    } finally { setLoading(false); }
  };

  const handleGenerar = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'operaciones'), {
        entidadId: selectedEntityId,
        entidadNombre: entities.find(e => e.id === selectedEntityId)?.fantasyName || entities.find(e => e.id === selectedEntityId)?.name,
        clienteNombre: cuadData.nombre,
        clienteDni: dni,
        monto: parseFloat(monto),
        cuotas: parseInt(cuotas),
        valorCuota: sim?.cuota,
        sistema: sim?.sistema,
        cft: sim?.cft,
        estado: 'PENDIENTE_FIRMA',
        vendedor: currentUser?.email,
        fecha: serverTimestamp()
      });
      setStep(3);
      setToast({ message: "Crédito generado con éxito", type: "success" });
    } catch (e) {
      setToast({ message: "Error al registrar la operación", type: "error" });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-6 min-h-screen bg-slate-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex justify-between items-center">
        <h1 className="text-5xl font-black text-slate-950 tracking-tighter uppercase italic leading-none">Motor Originación <span className="text-blue-600 font-bold not-italic ml-2">PRO</span></h1>
      </div>

      <div className="bg-white rounded-[4rem] shadow-2xl border-2 border-slate-200 overflow-hidden">
        {step === 1 && (
          <div className="max-w-lg mx-auto py-24 px-8 space-y-12 animate-in fade-in duration-500">
             <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest pl-4">Entidad Financiera</label>
                <select value={selectedEntityId} onChange={e => setSelectedEntityId(e.target.value)} className="w-full p-6 bg-slate-100 border-4 border-slate-300 rounded-[2.5rem] font-black text-slate-950 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner text-xl appearance-none cursor-pointer">
                   {entities.map(e => <option key={e.id} value={e.id}>{e.fantasyName || e.name}</option>)}
                </select>
             </div>
             <div className="space-y-4 text-center">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Documento del Solicitante</label>
                <input type="text" value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} className="w-full text-center text-7xl font-black p-6 bg-transparent border-b-[12px] border-blue-600 outline-none text-slate-950 tracking-tighter" placeholder="00000000" />
             </div>
             <button onClick={handleConsultarDni} disabled={loading || dni.length < 7} className="w-full bg-blue-600 text-white font-black py-8 rounded-[3rem] text-2xl hover:bg-blue-700 shadow-2xl transition-all transform active:scale-95">
                {loading ? 'EVALUANDO RIESGO...' : 'INICIAR ORIGINACIÓN'}
             </button>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 animate-in slide-in-from-bottom-10 duration-700">
             <div className="lg:col-span-8 p-14 space-y-12 border-r-4 border-slate-100">
                <div className="flex items-center justify-between bg-slate-100 p-10 rounded-[3.5rem] border-4 border-slate-300 shadow-inner">
                   <div className="flex items-center space-x-10">
                      <div className="h-28 w-28 bg-blue-700 rounded-[2.5rem] flex items-center justify-center text-white font-black text-6xl shadow-2xl ring-8 ring-white">{cuadData?.nombre?.charAt(0)}</div>
                      <div className="space-y-2">
                        <h3 className="text-4xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">{cuadData?.nombre}</h3>
                        <p className="text-lg font-bold text-blue-700 uppercase tracking-[0.2em] opacity-90">DNI {dni} • Margen: ${cuadData?.margenAfectable?.toLocaleString()}</p>
                      </div>
                   </div>
                   <div className={`px-8 py-3 rounded-full text-sm font-black text-white uppercase tracking-widest ${bcraData?.apto ? 'bg-emerald-600' : 'bg-rose-600'} shadow-lg`}>
                      SIT BCRA: {bcraData?.situacion}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                   <div className="space-y-4">
                      <label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-10">Capital a Solicitar ($)</label>
                      <div className="relative group">
                        <span className="absolute left-10 top-7 font-black text-slate-400 text-4xl group-focus-within:text-blue-600 transition-colors">$</span>
                        <input type="number" value={monto} onChange={e => setMonto(e.target.value)} className="w-full p-8 pl-20 bg-slate-100 border-4 border-slate-400 rounded-[3rem] text-5xl font-black text-slate-950 focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner" />
                      </div>
                   </div>
                   <div className="space-y-4">
                      <label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-10">Plazo (Cuotas)</label>
                      <select value={cuotas} onChange={e => setCuotas(e.target.value)} className="w-full p-8 bg-slate-100 border-4 border-slate-400 rounded-[3rem] text-5xl font-black text-slate-950 focus:bg-white focus:border-blue-600 outline-none transition-all appearance-none cursor-pointer shadow-inner">
                         {entities.find(e => e.id === selectedEntityId)?.parametros?.plazos?.split(',').map((p:any) => (
                           <option key={p} value={p.trim()}>{p.trim()} CUOTAS</option>
                         ))}
                      </select>
                   </div>
                </div>

                <div className="bg-indigo-700 p-10 rounded-[3.5rem] flex justify-between items-center shadow-2xl">
                   <div className="flex items-center text-white">
                      <div className="bg-white/20 p-4 rounded-[2rem] mr-8">
                         <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      </div>
                      <div>
                        <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1 opacity-80">Ingeniería Bancaria Activa</p>
                        <p className="text-3xl font-black uppercase italic tracking-tighter leading-none">Cálculo {sim?.sistema}</p>
                      </div>
                   </div>
                   <div className="bg-white px-8 py-3 rounded-full font-black text-indigo-700 text-xs uppercase tracking-[0.2em]">
                      Simply Core v4.0
                   </div>
                </div>
             </div>

             <div className="lg:col-span-4 bg-slate-950 p-14 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="text-center space-y-16 relative z-10">
                   <div>
                      <p className="text-blue-500 text-[14px] font-black uppercase tracking-[0.6em] mb-12 italic">Cuota Mensual Fija</p>
                      <h2 className="text-[9rem] font-black italic tracking-tighter leading-none drop-shadow-[0_20px_40px_rgba(59,130,246,0.5)]">
                        ${sim?.cuota.toLocaleString(undefined, {maximumFractionDigits:0})}
                      </h2>
                   </div>
                   <div className="grid grid-cols-2 gap-8">
                      <div className="bg-white/5 p-8 rounded-[2.5rem] border-2 border-white/10 backdrop-blur-xl">
                         <p className="text-[11px] text-slate-500 uppercase font-black mb-3 leading-none opacity-60">T.E.Anual</p>
                         <p className="text-5xl font-black tracking-tighter leading-none">{sim?.tea.toFixed(1)}%</p>
                      </div>
                      <div className="bg-white/5 p-8 rounded-[2.5rem] border-2 border-white/10 backdrop-blur-xl">
                         <p className="text-[11px] text-emerald-500 uppercase font-black mb-3 leading-none opacity-90">C.F.T. Real</p>
                         <p className="text-5xl font-black text-emerald-400 tracking-tighter leading-none">{sim?.cft.toFixed(1)}%</p>
                      </div>
                   </div>
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] opacity-40 leading-relaxed mx-auto max-w-[280px]">Monto neto proyectado a transferir: ${sim?.neto.toLocaleString()}</p>
                </div>
                
                <div className="space-y-8 pt-16 relative z-10">
                   <div className={`p-8 rounded-[3rem] text-center text-sm font-black uppercase border-[6px] tracking-[0.4em] shadow-2xl transition-all ${bcraData?.apto && sim?.cuota <= cuadData?.margenAfectable ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/10 border-rose-500/50 text-rose-400'}`}>
                      {bcraData?.apto && sim?.cuota <= cuadData?.margenAfectable ? '✓ APTO ORIGINACIÓN' : '✕ OPERACIÓN RECHAZADA'}
                   </div>
                   <button onClick={handleGenerar} disabled={loading || !bcraData?.apto || (sim ? sim.cuota > cuadData?.margenAfectable : true)} className="w-full bg-blue-600 text-white py-12 rounded-[3.5rem] font-black text-4xl hover:bg-blue-500 shadow-[0_40px_90px_-15px_rgba(37,99,235,0.5)] disabled:bg-slate-800 disabled:text-slate-600 transition-all uppercase tracking-widest italic active:scale-95 ring-4 ring-transparent hover:ring-blue-400 transition-all">
                      GENERAR Y FIRMAR
                   </button>
                </div>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-48 space-y-20 animate-in zoom-in duration-1000">
             <div className="relative inline-block scale-125">
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
                <div className="h-64 w-64 bg-emerald-100 text-emerald-600 rounded-[6rem] flex items-center justify-center mx-auto shadow-2xl relative z-10 border-8 border-white">
                   <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                </div>
             </div>
             <div className="space-y-6">
                <h2 className="text-8xl font-black text-slate-950 uppercase italic tracking-tighter leading-none leading-none">¡Éxito Total!</h2>
                <p className="text-slate-500 text-3xl font-black uppercase tracking-[0.5em] italic opacity-50">Vínculo de firma enviado al solicitante.</p>
             </div>
             <button onClick={() => setStep(1)} className="bg-slate-950 text-white px-28 py-10 rounded-[4rem] font-black uppercase tracking-[0.8em] text-sm hover:bg-black transition-all shadow-2xl active:scale-95 border-2 border-white/10">NUEVA SIMULACIÓN</button>
          </div>
        )}
      </div>
    </div>
  );
}
