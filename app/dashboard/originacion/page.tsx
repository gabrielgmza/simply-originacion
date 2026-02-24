'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../src/lib/firebase';
import { Zap, Cpu, CheckCircle2, Wallet } from 'lucide-react';

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/login');
      else {
        setCurrentUser(user);
        fetchEntities();
      }
    });
    return () => unsub();
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
    const capTotal = capital + gastosAdmin;
    const seguro = capital * ((p.seguroVida || 0) / 100);

    let cuotaBase = 0;
    if (sistema === 'ALEMAN') {
      cuotaBase = (capTotal / n) + (capTotal * i);
    } else if (sistema === 'MIXTO') {
      const f = (capTotal * i) / (1 - Math.pow(1 + i, -n));
      const a = (capTotal / n) + (capTotal * i);
      cuotaBase = (f + a) / 2;
    } else {
      cuotaBase = (capTotal * i) / (1 - Math.pow(1 + i, -n));
    }

    const cuotaFinal = cuotaBase + seguro + ((p.feeFijo || 0) / n);
    const montoNeto = capital - (capital * ((p.gastosOtorgamientoPct || 0) / 100));
    const tea = (Math.pow(1 + i, 12) - 1) * 100;
    const cft = (Math.pow((cuotaFinal * n) / montoNeto, 1 / (n / 12)) - 1) * 100;

    return { cuota: cuotaFinal, tea, cft, sistema, neto: montoNeto, entName: ent?.fantasyName || ent?.name };
  };

  const sim = calcularFinanzas();

  const handleConsultar = async (e: React.FormEvent) => {
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

  const handleGenerar = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'operaciones'), {
        entidadId: selectedEntityId,
        entidadNombre: sim?.entName,
        clienteNombre: cuadData.nombre,
        clienteDni: dni,
        monto: parseFloat(monto),
        cuotas: parseInt(cuotas),
        valorCuota: sim?.cuota,
        sistema: sim?.sistema,
        cft: sim?.cft,
        estado: 'PENDIENTE_FIRMA',
        vendedor: currentUser?.email,
        fechaCreacion: serverTimestamp()
      });
      setStep(3);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b dark:border-white/5 pb-8">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.5em] italic leading-none">
            <Cpu className="w-3 h-3 fill-current" />
            <span>Smart Originator</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase italic text-slate-950 dark:text-white leading-none italic">Simulación</h1>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-[#0b1224]/70 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
        {step === 1 && (
          <form onSubmit={handleConsultar} className="max-w-xl mx-auto py-24 px-10 space-y-12 animate-in zoom-in-95">
             <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-6 leading-none italic">Canal Originador</label>
                <select value={selectedEntityId} onChange={e => setSelectedEntityId(e.target.value)} className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[1.5rem] px-8 py-5 text-lg font-black text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer">
                   {entities.map(e => <option key={e.id} value={e.id}>{e.fantasyName || e.name}</option>)}
                </select>
             </div>
             <div className="space-y-4 text-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none italic">DNI Solicitante</label>
                <input type="text" required value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} className="w-full text-center text-7xl font-black p-4 bg-transparent border-b-[10px] border-indigo-600 outline-none text-slate-950 dark:text-white tracking-tighter leading-none" placeholder="00000000" />
             </div>
             <button type="submit" disabled={loading || dni.length < 7} className="w-full bg-indigo-600 text-white font-black py-8 rounded-[2.5rem] text-xl shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase italic tracking-widest leading-none">
                {loading ? 'Calculando Perfil...' : 'Iniciar Evaluación'}
             </button>
          </form>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 animate-in slide-in-from-bottom-10">
             <div className="lg:col-span-7 p-12 space-y-12 border-r dark:border-white/5 font-black">
                <div className="bg-slate-50/50 dark:bg-white/[0.02] p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-inner flex items-center justify-between">
                   <div className="flex items-center space-x-6">
                      <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl shadow-xl italic leading-none">{cuadData?.nombre?.charAt(0)}</div>
                      <div>
                        <h3 className="text-2xl text-slate-950 dark:text-white uppercase italic leading-none tracking-tighter">{cuadData?.nombre}</h3>
                        <p className="text-xs text-indigo-500 uppercase tracking-widest mt-2 leading-none italic">BCRA SIT: {bcraData?.situacion}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 italic">Margen</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white leading-none">${cuadData?.margenAfectable?.toLocaleString()}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-8 font-black">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6 leading-none italic">Monto ($)</label>
                      <input type="number" value={monto} onChange={e => setMonto(e.target.value)} className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[1.5rem] px-6 py-5 text-3xl text-slate-950 dark:text-white focus:ring-4 focus:ring-indigo-500/10 outline-none leading-none shadow-sm" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6 leading-none italic">Plazo</label>
                      <select value={cuotas} onChange={e => setCuotas(e.target.value)} className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[1.5rem] px-6 py-5 text-3xl text-slate-950 dark:text-white outline-none cursor-pointer leading-none shadow-sm">
                         {entities.find(e => e.id === selectedEntityId)?.parametros?.plazos?.split(',').map((p:any) => (
                           <option key={p} value={p.trim()}>{p.trim()} MESES</option>
                         ))}
                      </select>
                   </div>
                </div>

                <div className="bg-indigo-600/5 p-8 rounded-[2.5rem] flex items-center border border-indigo-500/20">
                   <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mr-5 shadow-lg"><Wallet className="w-5 h-5" /></div>
                   <div>
                     <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1 italic">Amortización Bancaria</p>
                     <p className="text-xl uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">Sistema {sim?.sistema}</p>
                   </div>
                </div>
             </div>

             <div className="lg:col-span-5 bg-slate-950 p-16 flex flex-col justify-between text-white relative overflow-hidden font-black">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                <div className="text-center space-y-16 relative z-10">
                   <div className="space-y-2">
                      <p className="text-indigo-500 text-[11px] font-black uppercase tracking-[0.5em] italic leading-none">Cuota Mensual Fija</p>
                      <h2 className="text-[8rem] font-black italic tracking-tighter leading-none drop-shadow-[0_20px_40px_rgba(59,130,246,0.3)] leading-none">
                        ${sim?.cuota.toLocaleString(undefined, {maximumFractionDigits:0})}
                      </h2>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                         <p className="text-[10px] text-slate-500 uppercase mb-2 opacity-60 leading-none italic">T.E.A.</p>
                         <p className="text-4xl tracking-tighter leading-none italic">{sim?.tea.toFixed(1)}%</p>
                      </div>
                      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                         <p className="text-[10px] text-emerald-500 uppercase mb-2 leading-none italic">C.F.T. Real</p>
                         <p className="text-4xl text-emerald-400 tracking-tighter leading-none italic">{sim?.cft.toFixed(1)}%</p>
                      </div>
                   </div>
                </div>
                
                <div className="pt-10 space-y-6 relative z-10">
                   <div className={`p-6 rounded-[2rem] text-center text-[10px] font-black uppercase border-2 tracking-[0.3em] ${bcraData?.apto && sim?.cuota <= cuadData?.margenAfectable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                      {bcraData?.apto && sim?.cuota <= cuadData?.margenAfectable ? '✓ APTO ORIGINACIÓN' : '✕ RECHAZO AUTOMÁTICO'}
                   </div>
                   <button onClick={handleGenerar} disabled={loading || !bcraData?.apto || (sim ? sim.cuota > cuadData?.margenAfectable : true)} className="w-full bg-indigo-600 text-white py-10 rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-indigo-500 hover:scale-[1.02] active:scale-95 transition-all uppercase italic tracking-widest leading-none">
                      Generar Activo
                   </button>
                </div>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-48 space-y-16 animate-in zoom-in-95 font-black">
             <div className="h-40 w-40 bg-indigo-600 rounded-[4rem] shadow-2xl flex items-center justify-center mx-auto ring-8 ring-indigo-500/10 animate-pulse leading-none">
                <CheckCircle2 className="w-20 h-20 text-white" />
             </div>
             <div className="space-y-4">
                <h2 className="text-8xl text-slate-950 dark:text-white uppercase italic tracking-tighter leading-none">¡Éxito!</h2>
                <p className="text-slate-400 text-2xl uppercase tracking-[0.4em] italic opacity-50 leading-none">Contrato enviado para firma.</p>
             </div>
             <button onClick={() => setStep(1)} className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-20 py-8 rounded-[2.5rem] font-black uppercase tracking-[0.8em] text-sm hover:scale-105 transition-all shadow-xl leading-none">Nueva Simulación</button>
          </div>
        )}
      </div>
    </div>
  );
}
