'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { 
  Building2, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Save, 
  Plus, 
  Percent, 
  User as UserIcon, 
  Info 
} from 'lucide-react';

export default function EntidadesPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [toast, setToast] = useState<any>(null);

  const [platformData, setPlatformData] = useState({
    name: '', fantasyName: '', cuit: '', contactPerson: '', comisionSaaS: 2.5
  });

  const [financialData, setFinancialData] = useState({
    tna: 120, gastosOtorgamientoPct: 2, sistemaAmortizacion: 'FRANCES'
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
      } else {
        await addDoc(collection(db, 'entities'), payload);
      }
      setIsEditing(false);
      fetchEntities();
      setToast({ msg: "Operación Exitosa", type: "success" });
    } catch (e) { setToast({ msg: "Error de Red", type: "error" }); }
    finally { setLoading(false); }
  };

  const Input = ({ label, icon: Icon, value, onChange, type = "text" }: any) => (
    <div className="space-y-2 text-slate-900 dark:text-white">
      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4 flex items-center italic">
        <Icon className="w-3 h-3 mr-1.5 text-indigo-500" /> {label}
      </label>
      <input type={type} value={value} onChange={onChange} className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-[12px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[100] px-5 py-3 rounded-2xl shadow-2xl border flex items-center space-x-3 ${toast.type === 'success' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-rose-600 border-rose-400 text-white'}`}>
          <Zap className="w-4 h-4 fill-current" />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{toast.msg}</span>
        </div>
      )}

      <div className="flex items-end justify-between border-b dark:border-white/5 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-white leading-none italic uppercase">Entidades</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Node Administration Core</p>
        </div>
        <button onClick={() => { setIsEditing(false); setPlatformData({ name: '', fantasyName: '', cuit: '', contactPerson: '', comisionSaaS: 2.5 }); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all italic leading-none">
           <Plus className="w-3.5 h-3.5 mr-2" /> Adherir Nodo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#0b1224] p-10 rounded-[2.5rem] shadow-sm border border-slate-200/60 dark:border-white/5">
            <form onSubmit={handleSubmit} className="space-y-10 font-bold italic uppercase">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input icon={Building2} label="Razón Social" value={platformData.name} onChange={(e:any) => setPlatformData({...platformData, name: e.target.value})} />
                <Input icon={ShieldCheck} label="CUIT / Tax ID" value={platformData.cuit} onChange={(e:any) => setPlatformData({...platformData, cuit: e.target.value})} />
                <div className="bg-indigo-600 p-6 rounded-[2rem] flex flex-col justify-center text-center shadow-2xl ring-4 ring-indigo-50 dark:ring-indigo-500/5 transition-transform hover:scale-[1.02]">
                   <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1 opacity-70 italic leading-none">SaaS Fee (%)</label>
                   <input type="number" step="0.1" value={platformData.comisionSaaS} onChange={e => setPlatformData({...platformData, comisionSaaS: parseFloat(e.target.value)})} className="bg-transparent text-white text-4xl font-black text-center outline-none tracking-tighter" />
                </div>
                <Input icon={UserIcon} label="Responsable" value={platformData.contactPerson} onChange={(e:any) => setPlatformData({...platformData, contactPerson: e.target.value})} />
              </div>
              <div className="flex justify-end pt-4 italic">
                <button type="submit" disabled={loading} className="bg-slate-950 dark:bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-105 transition-all flex items-center italic shadow-indigo-500/20 leading-none">
                  <Save className="w-3.5 h-3.5 mr-2" /> {isEditing ? 'Sincronizar Nodo' : 'Activar Entidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="space-y-4">
           <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-6 italic">Red de Nodos</h5>
           {entities.map(ent => (
             <div key={ent.id} onClick={() => { setPlatformData({ name: ent.name, fantasyName: ent.fantasyName || '', cuit: ent.cuit || '', contactPerson: ent.contactPerson || '', comisionSaaS: ent.comisionSaaS || 2.5 }); setFinancialData({...ent.parametros}); setCurrentId(ent.id); setIsEditing(true); }} className="bg-white/60 dark:bg-[#0b1224]/60 backdrop-blur-md p-5 rounded-[1.8rem] border border-slate-200 dark:border-white/5 hover:border-indigo-500 transition-all cursor-pointer group flex justify-between items-center shadow-sm uppercase italic">
                <div>
                  <p className="text-xs font-black text-slate-950 dark:text-white leading-none mb-1.5">{ent.name}</p>
                  <span className="text-[8px] font-black text-indigo-500 tracking-widest italic">SaaS: {ent.comisionSaaS}%</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
