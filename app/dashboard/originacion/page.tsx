'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[100] flex items-center p-5 min-w-[350px] rounded-3xl shadow-2xl border-4 ${type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-rose-600 border-rose-400'} text-white`}>
      <p className="font-black text-sm uppercase tracking-tight flex-1">{message}</p>
      <button onClick={onClose} className="ml-4 font-bold text-xl">✕</button>
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
    } catch (e) { console.error(e); }
  };

  const calcularFinanzas = () => {
    const capital = parseFloat(monto) || 0;
    if (capital <= 0) return null;
    const n = parseInt(cuotas) || 12;
    const ent = entities.find(e => e.id === selectedEntityId);
    const p = ent?.parametros || {};
    const sistema = p.sistemaAmortizacion || 'FRANCES';
    const tna = (p.tna || 120) / 100;
    const i = tna / 12;

    const gastosAdmin = capital * ((p.gastosAdminPct || 0) / 100);
    const gastosOtorg = capital * ((p.gastosOtorgamientoPct || 0) / 100);
    const capFin = capital + gastosAdmin;
    const seguro = capital * ((p.seguroVida || 0) / 100);

    let cuotaBase = 0;
    if (sistema === 'ALEMAN') {
      cuotaBase = (capFin / n) + (capFin * i);
    } else if (sistema === 'MIXTO') {
      const f = (capFin * i) / (1 - Math.pow(1 + i, -n));
      const a = (capFin / n) + (capFin * i);
      cuotaBase = (f + a) / 2;
    } else {
      cuotaBase = (capFin * i) / (1 - Math.pow(1 + i, -n));
    }

    const cuotaFinal = cuotaBase + seguro + ((p.feeFijo || 0) / n);
    const montoNeto = capital - gastosOtorg;
    const tea = (Math.pow(1 + i, 12) - 1) * 100;
    const cft = (Math.pow((cuotaFinal * n) / montoNeto, 1 / (n / 12)) - 1) * 100;

    return { cuota: cuotaFinal, tea, cft, sistema, neto: montoNeto };
  };

  const sim = calcularFinanzas();

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
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-6 bg-slate-50 min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-5xl font-black text-slate-950 uppercase italic leading-none tracking-tighter">Simulador Originación</h1>
      <div className="bg-white rounded-[3.5rem] shadow-2xl border-4 border-slate-400 overflow-hidden min-h-[500px]">
        {step === 1 && (
          <form onSubmit={handleConsultarDni} className="max-w-lg mx-auto py-24 px-8 space-y-12">
             <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest pl-4">Financiera</label>
                <select value={selectedEntityId} onChange={e => setSelectedEntityId(e.target.value)} className="w-full p-6 bg-slate-100 border-4 border-slate-800 rounded-[2.5rem] font-black text-slate-950 text-xl">
                   {entities.map(e => <option key={e.id} value={e.id}>{e.fantasyName || e.name}</option>)}
                </select>
             </div>
             <div className="space-y-4 text-center">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest">DNI Solicitante</label>
                <input type="text" value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} className="w-full text-center text-7xl font-black p-6 bg-transparent border-b-[15px] border-blue-600 outline-none text-slate-950" placeholder="00000000" />
             </div>
             <button type="submit" className="w-full bg-blue-600 text-white font-black py-8 rounded-[3rem] text-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-xl">
                {loading ? 'VALIDANDO...' : 'INICIAR EVALUACIÓN'}
             </button>
          </form>
        )}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 animate-in slide-in-from-bottom-10 duration-700">
             <div className="lg:col-span-8 p-14 space-y-12 border-r-4 border-slate-100">
                <div className="bg-slate-100 p-10 rounded-[3.5rem] border-4 border-slate-800 shadow-inner">
                   <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">{cuadData?.nombre}</h3>
                   <p className="text-lg font-bold text-blue-700 mt-2 uppercase tracking-widest">DNI {dni} • Margen: ${cuadData?.margenAfectable?.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4 font-black">
                   <div className="space-y-4"><label className="text-[12px] uppercase ml-10 text-slate-500">Monto Solicitado</label><input type="number" value={monto} onChange={e => setMonto(e.target.value)} className="w-full p-8 bg-slate-100 border-4 border-slate-800 rounded-[3rem] text-5xl text-slate-950 focus:bg-white outline-none shadow-inner" /></div>
                   <div className="space-y-4"><label className="text-[12px] uppercase ml-10 text-slate-500">Cuotas</label><select value={cuotas} onChange={e => setCuotas(e.target.value)} className="w-full p-8 bg-slate-100 border-4 border-slate-800 rounded-[3rem] text-5xl text-slate-950 focus:bg-white outline-none cursor-pointer">
                     {entities.find(e => e.id === selectedEntityId)?.parametros?.plazos?.split(',').map((p:any) => (<option key={p} value={p.trim()}>{p.trim()} CUOTAS</option>))}
                   </select></div>
                </div>
                <div className="bg-indigo-700 p-10 rounded-[3.5rem] text-white shadow-2xl flex justify-between items-center">
                   <p className="text-3xl font-black uppercase italic tracking-tighter leading-none">Sistema {sim?.sistema}</p>
                </div>
             </div>
             <div className="lg:col-span-4 bg-slate-950 p-14 flex flex-col justify-between text-white shadow-[inset_0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="text-center space-y-16">
                   <div>
                      <p className="text-blue-500 text-[14px] font-black uppercase tracking-[0.6em] mb-12 italic">Cuota Mensual Fija</p>
                      <h2 className="text-[9rem] font-black text-white italic tracking-tighter leading-none drop-shadow-[0_20px_40px_rgba(59,130,246,0.5)]">
                        ${sim?.cuota.toLocaleString(undefined, {maximumFractionDigits:0})}
                      </h2>
                   </div>
                   <div className="grid grid-cols-2 gap-8 text-center font-black">
                      <div className="bg-white/5 p-8 rounded-[2.5rem] border-2 border-white/10 backdrop-blur-xl">
                         <p className="text-[11px] text-slate-500 uppercase mb-3 leading-none opacity-60">T.E.Anual</p>
                         <p className="text-4xl tracking-tighter leading-none">{sim?.tea.toFixed(1)}%</p>
                      </div>
                      <div className="bg-white/5 p-8 rounded-[2.5rem] border-2 border-white/10 backdrop-blur-xl">
                         <p className="text-[11px] text-emerald-500 uppercase mb-3 leading-none opacity-80">C.F.T. Real</p>
                         <p className="text-4xl text-emerald-400 tracking-tighter leading-none">{sim?.cft.toFixed(1)}%</p>
                      </div>
                   </div>
                </div>
                <button onClick={() => setStep(3)} className="w-full bg-blue-600 text-white py-12 rounded-[3.5rem] font-black text-4xl hover:bg-blue-500 shadow-[0_40px_90px_-15px_rgba(37,99,235,0.5)] active:scale-95 transition-all">
                   GENERAR Y FIRMAR
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
