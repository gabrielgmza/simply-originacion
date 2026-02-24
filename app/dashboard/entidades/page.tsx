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
  Info,
  Globe
} from 'lucide-react';

export default function EntidadesPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [platformData, setPlatformData] = useState({
    name: '', fantasyName: '', cuit: '', contactPerson: '', comisionSaaS: 2.5
  });

  const [financialData, setFinancialData] = useState({
    tna: 120, gastosOtorgamientoPct: 2, sistemaAmortizacion: 'FRANCES'
  });

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const snap = await getDocs(collection(db, 'entities'));
      setEntities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } finally {
      setLoading(false);
    }
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
      setToast({ msg: "Sistema Sincronizado", type: "success" });
    } catch (e) {
      setToast({ msg: "Error de red", type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const Input = ({ label, icon: Icon, value, onChange, type = "text" }: any) => (
    <div className="space-y-2 font-bold italic uppercase">
      <label className="text-[10px] text-slate-400 dark:text-slate-500 tracking-widest ml-4 flex items-center">
        <Icon className="w-3.5 h-3.5 mr-2 text-[#FF5E14]" /> {label}
      </label>
      <input 
        type={type} 
        value={value} 
        onChange={onChange} 
        className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF5E14] transition-all shadow-sm text-slate-900 dark:text-white" 
      />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 italic font-bold uppercase leading-none">
      {toast && (
        <div className={`fixed top-10 right-10 z-[100] px-6 py-4 rounded-[2rem] shadow-2xl border flex items-center space-x-3 animate-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-[#FF5E14] border-[#FF5E14] text-white' : 'bg-rose-600 border-rose-400 text-white'}`}>
          <Zap className="w-5 h-5 fill-current" />
          <span className="text-xs font-black uppercase tracking-widest italic">{toast.msg}</span>
        </div>
      )}

      <div className="flex items-center justify-between pb-6 border-b dark:border-white/5">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900 dark:text-white leading-none">Nodos Core</h1>
          <p className="text-[11px] font-bold text-slate-400 tracking-[0.4em] uppercase">Configuración de Financieras</p>
        </div>
        <button 
          onClick={() => { setIsEditing(false); setPlatformData({ name: '', fantasyName: '', cuit: '', contactPerson: '', comisionSaaS: 2.5 }); }}
          className="bg-[#FF5E14] text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-orange-600/30 hover:scale-105 transition-all flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" /> Nueva Entidad
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#111111] p-10 rounded-[3rem] shadow-xl border border-slate-100 dark:border-white/5">
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input icon={Building2} label="Razón Social" value={platformData.name} onChange={(e:any) => setPlatformData({...platformData, name: e.target.value})} />
                <Input icon={ShieldCheck} label="CUIT Fiscal" value={platformData.cuit} onChange={(e:any) => setPlatformData({...platformData, cuit: e.target.value})} />
                <div className="bg-[#FF5E14] p-8 rounded-[2.5rem] flex flex-col justify-center text-center shadow-2xl ring-4 ring-orange-50 dark:ring-white/5 transition-transform hover:scale-[1.02]">
                   <label className="text-[10px] font-black text-orange-100 uppercase tracking-widest mb-1 opacity-70">SaaS Fee (%)</label>
                   <input 
                    type="number" 
                    step="0.1" 
                    value={platformData.comisionSaaS} 
                    onChange={e => setPlatformData({...platformData, comisionSaaS: parseFloat(e.target.value)})} 
                    className="bg-transparent text-white text-6xl font-black text-center outline-none tracking-tighter italic" 
                  />
                </div>
                <Input icon={UserIcon} label="Responsable" value={platformData.contactPerson} onChange={(e:any) => setPlatformData({...platformData, contactPerson: e.target.value})} />
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" disabled={loading} className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl hover:scale-105 transition-all">
                  <Save className="w-4 h-4 mr-3" /> {isEditing ? 'Guardar Cambios' : 'Activar Nodo'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl border border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-orange-600/5 group-hover:bg-orange-600/10 transition-colors"></div>
              <Info className="w-10 h-10 mb-8 text-[#FF5E14] relative z-10 opacity-70" />
              <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-4 relative z-10 leading-none">Security</h4>
              <p className="text-[12px] font-medium text-slate-400 leading-relaxed relative z-10 opacity-90 italic">
                La configuración se aplica en tiempo real para todas las nuevas originaciones del ecosistema Simply.
              </p>
           </div>
           
           <div className="space-y-4">
              <h5 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 ml-8">Nodos Activos</h5>
              <div className="space-y-4">
                {entities.map(ent => (
                  <div 
                    key={ent.id} 
                    onClick={() => { setPlatformData({ name: ent.name, fantasyName: ent.fantasyName || '', cuit: ent.cuit || '', contactPerson: ent.contactPerson || '', comisionSaaS: ent.comisionSaaS || 2.5 }); setFinancialData({...ent.parametros}); setIsEditing(true); setCurrentId(ent.id); }} 
                    className="bg-white dark:bg-[#111111] p-6 rounded-[2.2rem] border border-slate-100 dark:border-white/5 hover:border-[#FF5E14] transition-all cursor-pointer group flex justify-between items-center shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-black uppercase italic tracking-tighter text-slate-950 dark:text-white mb-2">{ent.name}</p>
                      <span className="text-[10px] font-black text-[#FF5E14] tracking-widest italic opacity-80 uppercase">SaaS: {ent.comisionSaaS}%</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#FF5E14] group-hover:translate-x-2 transition-all" />
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
