'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Building, 
  Settings2, 
  Percent, 
  CreditCard, 
  Save, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white dark:bg-[#0b101c] border border-slate-200/60 dark:border-white/5 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const Input = ({ label, icon: Icon, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-4 flex items-center">
      <Icon className="w-3 h-3 mr-1.5 text-indigo-500/70" />
      {label}
    </label>
    <div className="relative group">
      <input {...props} className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 text-[13px] font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all placeholder:text-slate-300 dark:placeholder:text-white/10" />
    </div>
  </div>
);

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

  useEffect(() => { 
    fetchEntities(); 
  }, []);

  const fetchEntities = async () => {
    try {
      const snap = await getDocs(collection(db, 'entities'));
      setEntities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } finally { setLoading(false); }
  };

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...platformData, parametros: financialData, updatedAt: new Date().toISOString() };
    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, 'entities', currentId), payload);
        showToast("Configuración bancaria sincronizada");
      } else {
        await addDoc(collection(db, 'entities'), payload);
        showToast("Nueva entidad adherida con éxito");
      }
      setIsEditing(false);
      fetchEntities();
    } catch (e) { showToast("Error de conexión", "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      {toast && (
        <div className={`fixed bottom-10 right-10 z-50 p-5 rounded-2xl shadow-2xl border flex items-center space-x-3 animate-in slide-in-from-right-10 ${toast.type === 'success' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-rose-600 border-rose-400 text-white'}`}>
          <Zap className="w-5 h-5 fill-current" />
          <span className="text-xs font-black uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-indigo-500 font-bold text-[10px] uppercase tracking-[0.4em]">
            <Building className="w-3 h-3" />
            <span>Multi-Tenant Core</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight italic uppercase">Entidades</h1>
        </div>
        <div className="bg-white dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 flex space-x-1">
          <button className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">Registro</button>
          <button className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Auditoría</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* FORMULARIO */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-10">
            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="space-y-8">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Información de Contratación</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <Input icon={Building} label="Razón Social" value={platformData.name} onChange={(e:any) => setPlatformData({...platformData, name: e.target.value})} placeholder="Nombre legal de la entidad" />
                  <Input icon={ShieldCheck} label="CUIT / Tax ID" value={platformData.cuit} onChange={(e:any) => setPlatformData({...platformData, cuit: e.target.value})} placeholder="Número de registro" />
                  <Input icon={UserCircle} label="Responsable" value={platformData.contactPerson} onChange={(e:any) => setPlatformData({...platformData, contactPerson: e.target.value})} placeholder="Nombre del gerente" />
                  <Input icon={Settings2} label="Comisión SaaS (%)" type="number" step="0.1" value={platformData.comisionSaaS} onChange={(e:any) => setPlatformData({...platformData, comisionSaaS: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-8 pt-8 border-t dark:border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Motor de Cálculo Core</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-4 flex items-center">
                      <CreditCard className="w-3 h-3 mr-1.5 text-emerald-500" />
                      Amortización
                    </label>
                    <select value={financialData.sistemaAmortizacion} onChange={(e:any) => setFinancialData({...financialData, sistemaAmortizacion: e.target.value})} className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 text-[13px] font-bold outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                      <option value="FRANCES">SISTEMA FRANCÉS</option>
                      <option value="ALEMAN">SISTEMA ALEMÁN</option>
                      <option value="MIXTO">SISTEMA MIXTO</option>
                    </select>
                  </div>
                  <Input icon={Percent} label="TNA Base (%)" type="number" value={financialData.tna} onChange={(e:any) => setFinancialData({...financialData, tna: parseFloat(e.target.value)})} />
                  <Input icon={Percent} label="Otorgamiento (%)" type="number" value={financialData.gastosOtorgamientoPct} onChange={(e:any) => setFinancialData({...financialData, gastosOtorgamientoPct: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button type="submit" disabled={loading} className="bg-slate-900 dark:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:scale-105 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Actualizar Core' : 'Adherir Entidad'}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* SIDEBAR DE ESTADO */}
        <div className="space-y-8">
          <Card className="p-8 bg-indigo-600 text-white border-none relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
             <Info className="w-10 h-10 mb-6 opacity-40" />
             <h4 className="text-xl font-black italic uppercase leading-none tracking-tighter mb-4">Soporte Estratégico</h4>
             <p className="text-[13px] text-indigo-100 font-medium leading-relaxed opacity-80">
               La configuración del Core Impacta en tiempo real en todos los puntos de venta adheridos. Verifique las tasas de punitorios y el sistema de amortización antes de guardar.
             </p>
          </Card>

          <div className="space-y-4">
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4">Entidades Conectadas</h5>
            <div className="space-y-3">
              {entities.map(ent => (
                <div key={ent.id} onClick={() => setCurrentId(ent.id)} className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-slate-200/60 dark:border-white/5 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer group">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[13px] font-black uppercase italic tracking-tighter">{ent.fantasyName || ent.name}</p>
                      <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">SaaS Fee: {ent.comisionSaaS}%</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
