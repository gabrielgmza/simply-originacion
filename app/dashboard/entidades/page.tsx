'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../src/lib/firebase';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[100] p-5 rounded-3xl shadow-2xl border-4 ${type === 'success' ? 'bg-emerald-600 border-emerald-400 shadow-emerald-100' : 'bg-rose-600 border-rose-400 shadow-rose-100'} text-white font-black text-xs uppercase tracking-widest animate-in slide-in-from-top-4 duration-300`}>
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

  // DATOS DEL DUEÑO DE LA PLATAFORMA (Tú los editas)
  const [platformData, setPlatformData] = useState({
    name: '', fantasyName: '', cuit: '', address: '', phone: '', email: '', contactPerson: '', comisionSaaS: 2.5
  });

  // PARÁMETROS QUE AJUSTA LA ENTIDAD
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...platformData, parametros: financialData, updatedAt: new Date().toISOString() };
    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, 'entities', currentId), payload);
        setToast({message: "CONFIGURACIÓN CORE ACTUALIZADA", type: "success"});
      } else {
        await addDoc(collection(db, 'entities'), payload);
        setToast({message: "NUEVA ENTIDAD REGISTRADA", type: "success"});
      }
      setIsEditing(false);
      fetchEntities();
    } catch (e) { setToast({message: "ERROR CRÍTICO AL GUARDAR", type: "error"}); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-24 p-6 bg-slate-50 min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="space-y-2">
        <h1 className="text-6xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Consola Core SaaS</h1>
        <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px] pl-2 opacity-60 italic">Simply Originación • Enterprise Edition</p>
      </div>

      <div className="bg-white p-14 rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-2 border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-16">
           
           <div className="space-y-10">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.5em] border-b-4 border-blue-50 pb-6 flex justify-between">
                <span>1. Registro de Entidad (Administrador)</span>
                <span className="text-slate-300 font-normal">DATOS DE CONTRATACIÓN</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-2 space-y-4"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-6">Razón Social</label><input required value={platformData.name} onChange={e => setPlatformData({...platformData, name: e.target.value})} className="w-full p-5 bg-slate-100 border-4 border-slate-300 rounded-[2rem] focus:border-blue-600 focus:bg-white outline-none text-slate-950 font-black text-xl shadow-inner transition-all" /></div>
                <div className="space-y-4"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-6">CUIT</label><input value={platformData.cuit} onChange={e => setPlatformData({...platformData, cuit: e.target.value})} className="w-full p-5 bg-slate-100 border-4 border-slate-300 rounded-[2rem] focus:border-blue-600 focus:bg-white outline-none text-slate-950 font-black text-xl shadow-inner transition-all" /></div>
                <div className="space-y-4"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-6">Nombre Fantasía</label><input value={platformData.fantasyName} onChange={e => setPlatformData({...platformData, fantasyName: e.target.value})} className="w-full p-5 bg-slate-100 border-4 border-slate-300 rounded-[2rem] focus:border-blue-600 focus:bg-white outline-none font-black text-xl shadow-inner transition-all" /></div>
                <div className="space-y-4"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-6">Responsable de Cuenta</label><input value={platformData.contactPerson} onChange={e => setPlatformData({...platformData, contactPerson: e.target.value})} className="w-full p-5 bg-slate-100 border-4 border-slate-300 rounded-[2rem] focus:border-blue-600 focus:bg-white outline-none font-black text-xl shadow-inner transition-all" /></div>
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] flex flex-col justify-center shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50">
                  <label className="text-[9px] font-black text-indigo-100 uppercase italic tracking-[0.2em] mb-2 opacity-70">Tu Comisión SaaS (%)</label>
                  <input type="number" step="0.1" value={platformData.comisionSaaS} onChange={e => setPlatformData({...platformData, comisionSaaS: parseFloat(e.target.value)})} className="bg-transparent text-white font-black text-5xl outline-none tracking-tighter" />
                </div>
              </div>
           </div>

           <div className="space-y-10">
              <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.5em] border-b-4 border-emerald-50 pb-6 flex justify-between">
                <span>2. Parametría Core (Configuración de Entidad)</span>
                <span className="text-slate-300 font-normal">LÓGICA FINANCIERA</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="space-y-4"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-6">Amortización</label>
                  <select value={financialData.sistemaAmortizacion} onChange={e => setFinancialData({...financialData, sistemaAmortizacion: e.target.value})} className="w-full p-6 bg-emerald-50 border-4 border-emerald-200 rounded-[2rem] font-black text-emerald-900 outline-none shadow-sm text-lg cursor-pointer">
                    <option value="FRANCES">SIST. FRANCÉS</option>
                    <option value="ALEMAN">SIST. ALEMÁN</option>
                    <option value="MIXTO">SIST. MIXTO</option>
                  </select>
                </div>
                <div className="space-y-4"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-6">TNA Base (%)</label><input type="number" value={financialData.tna} onChange={e => setFinancialData({...financialData, tna: parseFloat(e.target.value)})} className="w-full p-6 bg-slate-100 border-4 border-slate-300 rounded-[2rem] font-black text-blue-600 text-3xl shadow-inner focus:bg-white transition-all" /></div>
                <div className="space-y-4"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-6">Gasto Admin %</label><input type="number" value={financialData.gastosAdminPct} onChange={e => setFinancialData({...financialData, gastosAdminPct: parseFloat(e.target.value)})} className="w-full p-6 bg-slate-100 border-4 border-slate-300 rounded-[2rem] font-black text-slate-900 text-3xl shadow-inner focus:bg-white transition-all" /></div>
                <div className="space-y-4"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-6">Gasto Otorg %</label><input type="number" value={financialData.gastosOtorgamientoPct} onChange={e => setFinancialData({...financialData, gastosOtorgamientoPct: parseFloat(e.target.value)})} className="w-full p-6 bg-slate-100 border-4 border-slate-300 rounded-[2rem] font-black text-slate-900 text-3xl shadow-inner focus:bg-white transition-all" /></div>
              </div>
           </div>

           <div className="flex justify-end pt-12 border-t-2 border-slate-50">
              <button type="submit" disabled={loading} className="bg-slate-950 text-white px-24 py-9 rounded-[3rem] font-black uppercase tracking-[0.4em] text-lg hover:bg-black transition-all shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] active:scale-95 hover:scale-[1.03]">
                {isEditing ? 'ACTUALIZAR CORE ENGINE' : 'REGISTRAR NUEVA ENTIDAD'}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}
