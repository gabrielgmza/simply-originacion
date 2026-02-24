'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[100] p-5 rounded-3xl shadow-2xl border-4 ${type === 'success' ? 'bg-emerald-700 border-emerald-400' : 'bg-rose-700 border-rose-400'} text-white font-black text-xs uppercase tracking-widest animate-in slide-in-from-top-4 duration-300`}>
      {message}
    </div>
  );
};

export default function App() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // DATOS DE LA PLATAFORMA (SaaS OWNER)
  const [platformData, setPlatformData] = useState({
    name: '', fantasyName: '', cuit: '', address: '', phone: '', email: '', contactPerson: '', comisionSaaS: 2.5
  });

  // DATOS CORE BANCARIOS (GESTIONADO POR ENTIDAD)
  const [financialData, setFinancialData] = useState({
    tna: 120, tea: 145, cft: 180, punitorios: 50, moratorios: 50, gastosAdminPct: 3,
    gastosOtorgamientoPct: 2, feeFijo: 0, seguroVida: 0.15, plazos: '6,12,18,24', sistemaAmortizacion: 'FRANCES'
  });

  useEffect(() => { fetchEntities(); }, []);

  const fetchEntities = async () => {
    setLoading(true);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...platformData, parametros: financialData, updatedAt: new Date().toISOString() };
    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, 'entities', currentId), payload);
        setToast({message: "SISTEMA ACTUALIZADO CORRECTAMENTE", type: "success"});
      } else {
        await addDoc(collection(db, 'entities'), payload);
        setToast({message: "NUEVA ENTIDAD REGISTRADA", type: "success"});
      }
      setIsEditing(false);
      fetchEntities();
    } catch (e) { setToast({message: "ERROR EN OPERACIÓN", type: "error"}); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-24 p-6 bg-slate-50 min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="space-y-2">
        <h1 className="text-6xl font-black text-slate-950 uppercase italic tracking-tighter leading-none tracking-tighter">Consola Core SaaS</h1>
        <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] pl-3 opacity-60 italic">Banca Personal • Multi-Tenant Engine</p>
      </div>

      <div className="bg-white p-14 rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-2 border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-16">
           
           <div className="space-y-10">
              <h3 className="text-[12px] font-black text-blue-700 uppercase tracking-[0.5em] border-b-8 border-blue-50 pb-6 flex justify-between items-center">
                <span>1. Datos de Contratación (Administrador)</span>
                <span className="text-slate-300 font-normal">SaaS OWNER</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-2 space-y-4"><label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-8">Razón Social</label><input required value={platformData.name} onChange={e => setPlatformData({...platformData, name: e.target.value})} className="w-full p-6 bg-slate-100 border-4 border-slate-400 rounded-[2rem] focus:border-blue-700 focus:bg-white outline-none text-slate-950 font-black text-2xl shadow-inner transition-all" /></div>
                <div className="space-y-4"><label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-8">CUIT</label><input value={platformData.cuit} onChange={e => setPlatformData({...platformData, cuit: e.target.value})} className="w-full p-6 bg-slate-100 border-4 border-slate-400 rounded-[2rem] focus:border-blue-700 focus:bg-white outline-none text-slate-950 font-black text-2xl shadow-inner transition-all" /></div>
                <div className="space-y-4"><label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-8">Nombre Fantasía</label><input value={platformData.fantasyName} onChange={e => setPlatformData({...platformData, fantasyName: e.target.value})} className="w-full p-6 bg-slate-100 border-4 border-slate-400 rounded-[2rem] focus:border-blue-700 focus:bg-white outline-none font-black text-2xl shadow-inner transition-all" /></div>
                <div className="space-y-4"><label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-8">Persona a Cargo</label><input value={platformData.contactPerson} onChange={e => setPlatformData({...platformData, contactPerson: e.target.value})} className="w-full p-6 bg-slate-100 border-4 border-slate-400 rounded-[2rem] focus:border-blue-700 focus:bg-white outline-none font-black text-2xl shadow-inner transition-all" /></div>
                <div className="bg-indigo-700 p-8 rounded-[3rem] flex flex-col justify-center shadow-2xl shadow-indigo-200 ring-[12px] ring-indigo-50">
                  <label className="text-[10px] font-black text-indigo-100 uppercase italic tracking-[0.2em] mb-2 opacity-80">Comisión SaaS (%)</label>
                  <input type="number" step="0.1" value={platformData.comisionSaaS} onChange={e => setPlatformData({...platformData, comisionSaaS: parseFloat(e.target.value)})} className="bg-transparent text-white font-black text-6xl outline-none tracking-tighter" />
                </div>
              </div>
           </div>

           <div className="space-y-10">
              <h3 className="text-[12px] font-black text-emerald-700 uppercase tracking-[0.5em] border-b-8 border-emerald-50 pb-6 flex justify-between items-center">
                <span>2. Parametría Bancaria (Entidad Financiera)</span>
                <span className="text-slate-300 font-normal">CORE ENGINE</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="space-y-4"><label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-8">Amortización</label>
                  <select value={financialData.sistemaAmortizacion} onChange={e => setFinancialData({...financialData, sistemaAmortizacion: e.target.value})} className="w-full p-6 bg-emerald-50 border-4 border-emerald-400 rounded-[2.5rem] font-black text-emerald-950 outline-none shadow-sm text-xl cursor-pointer">
                    <option value="FRANCES">SISTEMA FRANCÉS</option>
                    <option value="ALEMAN">SISTEMA ALEMÁN</option>
                    <option value="MIXTO">SISTEMA MIXTO</option>
                  </select>
                </div>
                <div className="space-y-4"><label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-8">TNA Base (%)</label><input type="number" value={financialData.tna} onChange={e => setFinancialData({...financialData, tna: parseFloat(e.target.value)})} className="w-full p-6 bg-slate-100 border-4 border-slate-400 rounded-[2.5rem] font-black text-blue-700 text-4xl shadow-inner focus:bg-white transition-all" /></div>
                <div className="space-y-4"><label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-8">Gasto Admin %</label><input type="number" value={financialData.gastosAdminPct} onChange={e => setFinancialData({...financialData, gastosAdminPct: parseFloat(e.target.value)})} className="w-full p-6 bg-slate-100 border-4 border-slate-400 rounded-[2.5rem] font-black text-slate-950 text-4xl shadow-inner focus:bg-white transition-all" /></div>
                <div className="space-y-4"><label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-8">Gasto Otorg %</label><input type="number" value={financialData.gastosOtorgamientoPct} onChange={e => setFinancialData({...financialData, gastosOtorgamientoPct: parseFloat(e.target.value)})} className="w-full p-6 bg-slate-100 border-4 border-slate-400 rounded-[2.5rem] font-black text-slate-950 text-4xl shadow-inner focus:bg-white transition-all" /></div>
              </div>
           </div>

           <div className="flex justify-end pt-14 border-t-4 border-slate-100">
              <button type="submit" disabled={loading} className="bg-slate-950 text-white px-28 py-10 rounded-[4rem] font-black uppercase tracking-[0.5em] text-2xl hover:bg-black transition-all shadow-[0_40px_100px_-15px_rgba(0,0,0,0.45)] active:scale-95 hover:scale-[1.03] ring-8 ring-transparent hover:ring-blue-600/10">
                {isEditing ? 'ACTUALIZAR CORE ENGINE' : 'REGISTRAR NUEVA ENTIDAD'}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}
