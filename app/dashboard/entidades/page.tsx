'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
// Ruta relativa ajustada para estructura src/lib desde app/dashboard/entidades
import { db } from '../../../lib/firebase';

export default function EntidadesPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [toast, setToast] = useState<any>(null);

  const [platformData, setPlatformData] = useState({
    name: '', fantasyName: '', cuit: '', email: '', contactPerson: '', comisionSaaS: 2.5
  });

  const [financialData, setFinancialData] = useState({
    tna: 120, gastosOtorgamientoPct: 2, feeFijo: 0, sistemaAmortizacion: 'FRANCES'
  });

  useEffect(() => { fetchEntities(); }, []);

  const fetchEntities = async () => {
    try {
      const snap = await getDocs(collection(db, 'entities'));
      setEntities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...platformData, parametros: financialData, updatedAt: new Date().toISOString() };
    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, 'entities', currentId), payload);
        setToast("Configuración Sincronizada");
      } else {
        await addDoc(collection(db, 'entities'), payload);
        setToast("Entidad Registrada");
      }
      setIsEditing(false);
      fetchEntities();
    } catch (e) { setToast("Error de Conexión"); }
    finally { setLoading(false); }
  };

  const Input = ({ label, value, onChange, type = "text" }: any) => (
    <div className="space-y-2.5">
      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">{label}</label>
      <input type={type} value={value} onChange={onChange} className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-[13px] font-bold text-slate-950 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
    </div>
  );

  return (
    <div className="space-y-12">
      {toast && (
        <div className="fixed bottom-10 right-10 z-[100] bg-indigo-600 text-white px-8 py-4 rounded-[2rem] shadow-2xl font-black text-[10px] uppercase tracking-widest animate-in slide-in-from-right-10">
          {toast}
        </div>
      )}

      <div className="flex items-end justify-between border-b dark:border-white/5 pb-10">
        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-tighter uppercase italic text-slate-950 dark:text-white leading-none">Entidades</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.5em]">Node Administration Core</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <div className="bg-white/80 dark:bg-[#0b1224]/80 backdrop-blur-xl p-12 rounded-[3rem] shadow-xl border border-slate-200/60 dark:border-white/5">
            <form onSubmit={handleSubmit} className="space-y-14">
              <div className="space-y-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 border-b dark:border-white/5 pb-4">1. Identidad Corporativa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <Input label="Razón Social" value={platformData.name} onChange={(e:any) => setPlatformData({...platformData, name: e.target.value})} />
                  <Input label="CUIT / Tax ID" value={platformData.cuit} onChange={(e:any) => setPlatformData({...platformData, cuit: e.target.value})} />
                  <div className="bg-indigo-600 p-8 rounded-[2.5rem] flex flex-col justify-center text-center shadow-2xl ring-8 ring-indigo-50 dark:ring-indigo-500/5 group hover:scale-[1.02] transition-transform">
                     <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 opacity-70 italic leading-none">SaaS Fee (%)</label>
                     <input type="number" step="0.1" value={platformData.comisionSaaS} onChange={e => setPlatformData({...platformData, comisionSaaS: parseFloat(e.target.value)})} className="bg-transparent text-white text-6xl font-black text-center outline-none tracking-tighter" />
                  </div>
                  <Input label="Responsable" value={platformData.contactPerson} onChange={(e:any) => setPlatformData({...platformData, contactPerson: e.target.value})} />
                </div>
              </div>

              <div className="space-y-10 pt-10 border-t dark:border-white/5 text-slate-900 dark:text-white font-bold">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 border-b dark:border-white/5 pb-4 leading-none">2. Parámetros de Amortización</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-5 leading-none">Sistema</label>
                    <select value={financialData.sistemaAmortizacion} onChange={(e:any) => setFinancialData({...financialData, sistemaAmortizacion: e.target.value})} className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-2xl px-6 py-4 text-[13px] font-bold outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer text-slate-900 dark:text-white">
                      <option value="FRANCES">SISTEMA FRANCÉS</option>
                      <option value="ALEMAN">SISTEMA ALEMÁN</option>
                      <option value="MIXTO">SISTEMA MIXTO</option>
                    </select>
                  </div>
                  <Input label="TNA (%)" type="number" value={financialData.tna} onChange={(e:any) => setFinancialData({...financialData, tna: parseFloat(e.target.value)})} />
                  <Input label="Gastos Otorg. (%)" type="number" value={financialData.gastosOtorgamientoPct} onChange={(e:any) => setFinancialData({...financialData, gastosOtorgamientoPct: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button type="submit" disabled={loading} className="bg-slate-950 dark:bg-indigo-600 text-white px-14 py-5 rounded-[2.2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:scale-105 active:scale-95 transition-all italic leading-none">
                  {isEditing ? 'Sincronizar Nodo' : 'Activar Entidad'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-white/5 ring-1 ring-white/10 group">
             <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
             <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-6 relative z-10 leading-none">Security Architecture</h4>
             <p className="text-sm font-medium text-slate-400 leading-relaxed relative z-10 opacity-90">
               La configuración del Core impacta en tiempo real. Los cambios de tasas afectarán únicamente a las nuevas solicitudes de originación.
             </p>
          </div>

          <div className="space-y-5">
            <h5 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 ml-8 leading-none">Operadoras Activas</h5>
            <div className="space-y-4">
              {entities.map(ent => (
                <div key={ent.id} onClick={() => { setIsEditing(true); setCurrentId(ent.id); }} className="bg-white/40 dark:bg-[#0b1224]/40 backdrop-blur-md p-7 rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 hover:border-indigo-500 transition-all cursor-pointer group flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-sm font-black uppercase italic tracking-tighter text-slate-950 dark:text-white leading-none mb-2">{ent.name}</p>
                    <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-widest leading-none">SaaS: {ent.comisionSaaS}%</p>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/5 flex items-center justify-center group-hover:bg-indigo-600 transition-all opacity-40 group-hover:opacity-100">→</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
