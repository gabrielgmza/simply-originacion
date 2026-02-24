'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] p-4 rounded-xl shadow-2xl border ${type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-rose-600 border-rose-400'} text-white font-bold text-xs uppercase animate-in slide-in-from-right-4`}>
      {message}
    </div>
  );
};

export default function EntidadesPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [platformData, setPlatformData] = useState({
    name: '', fantasyName: '', cuit: '', address: '', phone: '', email: '', contactPerson: '', comisionSaaS: 2.5
  });

  const [financialData, setFinancialData] = useState({
    tna: 120, punitorios: 50, moratorios: 50, gastosAdminPct: 3,
    gastosOtorgamientoPct: 2, feeFijo: 0, seguroVida: 0.15, plazos: '6,12,18,24', sistemaAmortizacion: 'FRANCES'
  });

  useEffect(() => { fetchEntities(); }, []);

  const fetchEntities = async () => {
    try {
      const snap = await getDocs(collection(db, 'entities'));
      setEntities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } finally { setLoading(false); }
  };

  const handleEdit = (ent: any) => {
    setPlatformData({
      name: ent.name || '', fantasyName: ent.fantasyName || '', cuit: ent.cuit || '',
      address: ent.address || '', phone: ent.phone || '', email: ent.email || '',
      contactPerson: ent.contactPerson || '', comisionSaaS: ent.comisionSaaS || 2.5
    });
    setFinancialData({ ...ent.parametros });
    setCurrentId(ent.id);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...platformData, parametros: financialData, updatedAt: new Date().toISOString() };
    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, 'entities', currentId), payload);
        setToast({message: "Sincronizado correctamente", type: "success"});
      } else {
        await addDoc(collection(db, 'entities'), payload);
        setToast({message: "Nueva entidad creada", type: "success"});
      }
      setIsEditing(false);
      fetchEntities();
    } catch (e) { setToast({message: "Error de red", type: "error"}); }
    finally { setLoading(false); }
  };

  const InputLabel = ({label, value, onChange, type="text", placeholder=""}: any) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:opacity-30" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase italic">Gestión de Financieras</h1>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">Parametría Core y Datos Legales</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] border-b dark:border-slate-800 pb-3">Información Corporativa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputLabel label="Razón Social" value={platformData.name} onChange={(e:any) => setPlatformData({...platformData, name: e.target.value})} />
                  <InputLabel label="CUIT" value={platformData.cuit} onChange={(e:any) => setPlatformData({...platformData, cuit: e.target.value})} />
                  <InputLabel label="Email Corporativo" value={platformData.email} onChange={(e:any) => setPlatformData({...platformData, email: e.target.value})} />
                  <InputLabel label="Persona Responsable" value={platformData.contactPerson} onChange={(e:any) => setPlatformData({...platformData, contactPerson: e.target.value})} />
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-center text-center">
                 <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Comisión SaaS Simply (%)</label>
                 <input type="number" step="0.1" value={platformData.comisionSaaS} onChange={e => setPlatformData({...platformData, comisionSaaS: parseFloat(e.target.value)})} className="bg-transparent text-slate-900 dark:text-white text-5xl font-black text-center outline-none" />
              </div>
           </div>

           <div className="space-y-6 pt-6 border-t dark:border-slate-800">
              <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] border-b dark:border-slate-800 pb-3">Lógica Financiera</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Amortización</label>
                  <select value={financialData.sistemaAmortizacion} onChange={e => setFinancialData({...financialData, sistemaAmortizacion: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold outline-none cursor-pointer">
                    <option value="FRANCES">SIST. FRANCÉS</option>
                    <option value="ALEMAN">SIST. ALEMÁN</option>
                    <option value="MIXTO">SIST. MIXTO</option>
                  </select>
                </div>
                <InputLabel label="TNA Anual (%)" type="number" value={financialData.tna} onChange={(e:any) => setFinancialData({...financialData, tna: parseFloat(e.target.value)})} />
                <InputLabel label="Gasto Otorg. (%)" type="number" value={financialData.gastosOtorgamientoPct} onChange={(e:any) => setFinancialData({...financialData, gastosOtorgamientoPct: parseFloat(e.target.value)})} />
                <InputLabel label="Fee Fijo ($)" type="number" value={financialData.feeFijo} onChange={(e:any) => setFinancialData({...financialData, feeFijo: parseFloat(e.target.value)})} />
              </div>
           </div>

           <div className="flex justify-end">
              <button type="submit" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-80 transition-all shadow-lg active:scale-95">
                {isEditing ? 'Actualizar Core' : 'Registrar Financiera'}
              </button>
           </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {entities.map(ent => (
          <div key={ent.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase italic truncate tracking-tight">{ent.fantasyName || ent.name}</h4>
                   <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-widest">Core v4.0</p>
                </div>
                <button onClick={() => handleEdit(ent)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
             </div>
             <div className="space-y-2 border-t dark:border-slate-800 pt-4">
                <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-400">TNA</span><span className="text-slate-900 dark:text-white">{ent.parametros?.tna}%</span></div>
                <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-400">SaaS Fee</span><span className="text-emerald-600">{ent.comisionSaaS}%</span></div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
