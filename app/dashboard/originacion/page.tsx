'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

// COMPONENTE TOAST (Notificaciones)
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-[100] flex items-center p-4 min-w-[320px] rounded-2xl shadow-2xl animate-in slide-in-from-right-full duration-300 border-2 ${
      type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-rose-600 border-rose-400'
    } text-white font-bold`}>
      <p className="flex-1 uppercase text-xs tracking-widest">{message}</p>
      <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
};

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
      setToast({ message: "Error cargando financieras", type: "error" });
    }
  };

  const calcularFinanzas = () => {
    const principal = parseFloat(monto) || 0;
    if (principal <= 0) return null;

    const n = parseInt(cuotas) || 12;
    const ent = entities.find(e => e.id === selectedEntityId);
    const p = ent?.parametros || {};
    const sistema = p.sistemaAmortizacion || 'FRANCES';

    const tna = (p.tna || 120) / 100;
    const i = tna / 12; // TEM

    const gastosAdmin = principal * ((p.gastosAdminPct || 0) / 100);
    const gastosOtorg = principal * ((p.gastosOtorgamientoPct || 0) / 100);
    const capitalFinanciado = principal + gastosAdmin;
    const seguroVida = principal * ((p.seguroVida || 0) / 100);

    let cuotaBase = 0;
    if (sistema === 'ALEMAN') {
      const amortizacion = capitalFinanciado / n;
      const interesPrimerMes = capitalFinanciado * i;
      cuotaBase = amortizacion + interesPrimerMes;
    } else if (sistema === 'MIXTO') {
      const cuotaF = (capitalFinanciado * i) / (1 - Math.pow(1 + i, -n));
      const cuotaA = (capitalFinanciado / n) + (capitalFinanciado * i);
      cuotaBase = (cuotaF + cuotaA) / 2;
    } else {
      cuotaBase = (capitalFinanciado * i) / (1 - Math.pow(1 + i, -n));
    }

    const cuotaFinal = cuotaBase + seguroVida;
    const montoNeto = principal - gastosOtorg;
    const tea = (Math.pow(1 + i, 12) - 1) * 100;
    const cft = (Math.pow((cuotaFinal * n) / montoNeto, 1 / (n / 12)) - 1) * 100;

    return { cuota: cuotaFinal, tea, cft, sistema, neto: montoNeto };
  };

  const fin = calcularFinanzas();

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
      setToast({ message: "Error de conexión con bases externas", type: "error" });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-4xl font-black text-slate-900 uppercase italic">Originación Digital Pro</h1>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden min-h-[500px]">
        {step === 1 && (
          <form onSubmit={handleConsultarDni} className="max-w-md mx-auto py-20 px-6 space-y-12">
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Canal Originador</label>
              <select value={selectedEntityId} onChange={e => setSelectedEntityId(e.target.value)} className="w-full p-5 bg-slate-100 border-2 border-slate-300 rounded-[2rem] font-bold text-slate-900 outline-none focus:border-blue-600 transition-all shadow-inner">
                {entities.map(e => <option key={e.id} value={e.id}>{e.fantasyName || e.name}</option>)}
              </select>
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest text-center block">DNI del Solicitante</label>
              <input type="text" value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} className="w-full text-center text-6xl font-black p-4 bg-transparent border-b-8 border-blue-600 outline-none text-slate-900" placeholder="00000000" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-black py-8 rounded-[2.5rem] hover:bg-blue-700 shadow-2xl active:scale-95 transition-all">
              {loading ? 'ANALIZANDO RIESGO...' : 'INICIAR EVALUACIÓN'}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
             <div className="lg:col-span-8 p-12 space-y-10 border-r border-slate-100">
                <div className="flex items-center justify-between bg-slate-50 p-10 rounded-[3rem] border-2 border-slate-200">
                   <div>
                      <h3 className="text-3xl font-black text-slate-900 uppercase italic">{cuadData?.nombre}</h3>
                      <p className="text-xs font-bold text-blue-600 tracking-widest mt-2 uppercase">Margen: ${cuadData?.margenAfectable.toLocaleString()}</p>
                   </div>
                   <span className={`px-6 py-2 rounded-2xl text-xs font-black text-white ${bcraData?.apto ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                      BCRA SIT {bcraData?.situacion}
                   </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">Capital a Solicitar</label>
                      <input type="number" value={monto} onChange={e => setMonto(e.target.value)} className="w-full p-8 bg-slate-100 border-2 border-slate-300 rounded-[2.5rem] text-4xl font-black text-slate-900 focus:bg-white outline-none transition-all shadow-inner" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">Plazo (Cuotas)</label>
                      <select value={cuotas} onChange={e => setCuotas(e.target.value)} className="w-full p-8 bg-slate-100 border-2 border-slate-300 rounded-[2.5rem] text-4xl font-black text-slate-900 outline-none">
                         {entities.find(e => e.id === selectedEntityId)?.parametros?.plazos?.split(',').map((p:any) => (
                           <option key={p} value={p.trim()}>{p.trim()} MESES</option>
                         ))}
                      </select>
                   </div>
                </div>

                <div className="bg-blue-50 p-8 rounded-[3rem] border-2 border-blue-200 flex justify-between items-center">
                   <p className="text-sm font-black text-blue-900 uppercase tracking-widest">Sistema de Amortización:</p>
                   <span className="bg-white px-6 py-2 rounded-full border-2 border-blue-200 font-black text-blue-700 text-xs uppercase italic shadow-sm">
                      SISTEMA {fin?.sistema}
                   </span>
                </div>
             </div>

             <div className="lg:col-span-4 bg-slate-950 p-12 flex flex-col justify-between text-white shadow-[inset_0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="text-center space-y-12">
                   <div>
                      <p className="text-blue-500 text-[12px] font-black uppercase tracking-[0.5em] mb-8 italic">Cuota Mensual Fija</p>
                      <h2 className="text-[7rem] font-black italic tracking-tighter drop-shadow-[0_15px_30px_rgba(59,130,246,0.45)] leading-none">
                        ${fin?.cuota.toLocaleString(undefined, {maximumFractionDigits:0})}
                      </h2>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white/5 p-6 rounded-[2.2rem] border border-white/10 backdrop-blur-xl">
                         <p className="text-[10px] text-slate-500 uppercase font-black mb-2 leading-none">T.E.A.</p>
                         <p className="text-4xl font-black tracking-tighter">{fin?.tea.toFixed(1)}%</p>
                      </div>
                      <div className="bg-white/5 p-6 rounded-[2.2rem] border border-white/10 backdrop-blur-xl">
                         <p className="text-[10px] text-emerald-500 uppercase font-black mb-2 leading-none">C.F.T. Real</p>
                         <p className="text-4xl font-black text-emerald-400 tracking-tighter">{fin?.cft.toFixed(1)}%</p>
                      </div>
                   </div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60">Recibe líquido: ${fin?.neto.toLocaleString()}</p>
                </div>
                <button onClick={() => setStep(3)} disabled={!bcraData?.apto || (fin ? fin.cuota > cuadData?.margenAfectable : true)} className="w-full bg-blue-600 py-10 rounded-[3rem] font-black text-3xl hover:bg-blue-500 shadow-2xl disabled:bg-slate-800 disabled:text-slate-600 transition-all uppercase tracking-widest italic active:scale-95">
                   GENERAR Y FIRMAR
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
