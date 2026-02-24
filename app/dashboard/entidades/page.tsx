'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../src/lib/firebase';
import { Building2, ShieldCheck, Zap, ArrowRight, Save, Info, Plus, Percent, CreditCard } from 'lucide-react';

const Toast = ({ message, type, onClose }: any) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed bottom-10 right-10 z-[100] p-6 rounded-[2.2rem] shadow-2xl border flex items-center space-x-4 animate-in slide-in-from-right-10 duration-500 ${type === 'success' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-rose-600 border-rose-400 text-white'}`}>
      <Zap className="w-5 h-5 fill-current" />
      <span className="text-xs font-black uppercase tracking-widest leading-none">{message}</span>
    </div>
  );
};

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
    tna: 120, gastosOtorgamientoPct: 2, feeFijo: 0, sistemaAmortizacion: 'FRANCES', plazos: '6,12,18,24'
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
        setToast({msg: "Sincronizado", type: "success"});
      } else {
        await addDoc(collection(db, 'entities'), payload);
        setToast({msg: "Activado", type: "success"});
      }
      setIsEditing(false);
      fetchEntities();
    } catch (e) { setToast({msg: "Error", type: "error"}); }
    finally { setLoading(false); }
  };

  const Input = ({ label, icon: Icon, value, onChange, type = "text" }: any) => (
    <div className="space-y-2.5">
      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-5 flex items-center leading-none">
        <Icon className="w-3 h-3 mr-2 text-indigo-500" />
        {label}
      </label>
      <input type={type} value={value} onChange={onChange} className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-[13px] font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm" />
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b dark:border-white/5 pb-10">
        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-tighter uppercase italic text-slate-950 dark:text-white leading-none">Entidades</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em]">Core de Administración SaaS</p>
        </div>
        <button className="bg-indigo-600 text-white px-8 py-3.5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center italic leading-none">
           <Plus className="w-4 h-4 mr-2" /> Adherir Nodo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <div className="bg-white/80 dark:bg-[#0b1224]/80 backdrop-blur-xl p-12 rounded-[3rem] shadow-xl border border-slate-200/60 dark:border-white/5">
            <form onSubmit={handleSubmit} className="space-y-14 text-slate-950 dark:text-white">
              <div className="space-y-10">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500 border-b dark:border-white/5 pb-4 leading-none">Contratación y Registro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <Input icon={Building2} label="Razón Social" value={platformData.name} onChange={(e:any) => setPlatformData({...platformData, name: e.target.value})} />
                  <Input icon={ShieldCheck} label="CUIT / Tax ID" value={platformData.cuit} onChange={(e:any) => setPlatformData({...platformData, cuit: e.target.value})} />
                  <div className="bg-indigo-600 p-8 rounded-[2.5rem] flex flex-col justify-center text-center shadow-2xl ring-[12px] ring-indigo-50 dark:ring-indigo-500/5 group hover:scale-[1.02] transition-transform">
                     <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 opacity-70 italic">SaaS Service Fee (%)</label>
                     <input type="number" step="0.1" value={platformData.comisionSaaS} onChange={e => setPlatformData({...platformData, comisionSaaS: parseFloat(e.target.value)})} className="bg-transparent text-white text-6xl font-black text-center outline-none tracking-tighter" />
                  </div>
                  <Input icon={User} label="Responsable" value={platformData.contactPerson} onChange={(e:any) => setPlatformData({...platformData, contactPerson: e.target.value})} />
                </div>
              </div>

              <div className="space-y-10 pt-10 border-t dark:border-white/5">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500 border-b dark:border-white/5 pb-4 leading-none">Parámetros Bancarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-5 flex items-center leading-none">
                       <CreditCard className="w-3 h-3 mr-2 text-emerald-500" /> Sistema
                    </label>
                    <select value={financialData.sistemaAmortizacion} onChange={(e:any) => setFinancialData({...financialData, sistemaAmortizacion: e.target.value})} className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-2xl px-6 py-4 text-[13px] font-bold outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer text-slate-900 dark:text-white">
                      <option value="FRANCES">FRANCÉS</option>
                      <option value="ALEMAN">ALEMÁN</option>
                      <option value="MIXTO">MIXTO</option>
                    </select>
                  </div>
                  <Input icon={Percent} label="TNA (%)" type="number" value={financialData.tna} onChange={(e:any) => setFinancialData({...financialData, tna: parseFloat(e.target.value)})} />
                  <Input icon={Plus} label="Gastos Otorg. (%)" type="number" value={financialData.gastosOtorgamientoPct} onChange={(e:any) => setFinancialData({...financialData, gastosOtorgamientoPct: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button type="submit" disabled={loading} className="bg-slate-950 dark:bg-indigo-600 text-white px-14 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center italic">
                  <Save className="w-4 h-4 mr-3" />
                  {isEditing ? 'Sincronizar' : 'Activar Entidad'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-white/5 ring-1 ring-white/10 group">
             <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
             <Info className="w-12 h-12 mb-8 text-indigo-500 relative z-10 opacity-60" />
             <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-6 relative z-10 leading-none">Security Architecture</h4>
             <p className="text-sm font-medium text-slate-400 leading-relaxed relative z-10 opacity-90">
               La configuración del Core impacta en tiempo real. Los cambios en el sistema de amortización solo afectarán a las nuevas simulaciones generadas.
             </p>
          </div>

          <div className="space-y-5">
            <h5 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 ml-8 leading-none">Red de Operadoras</h5>
            <div className="space-y-4">
              {entities.map(ent => (
                <div key={ent.id} onClick={() => { setIsEditing(true); setCurrentId(ent.id); }} className="bg-white/40 dark:bg-[#0b1224]/40 backdrop-blur-md p-7 rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 hover:border-indigo-500/50 hover:shadow-2xl transition-all cursor-pointer group flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-sm font-black uppercase italic tracking-tighter text-slate-950 dark:text-white leading-none mb-2">{ent.name}</p>
                    <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-widest leading-none">SaaS: {ent.comisionSaaS}%</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-2 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
