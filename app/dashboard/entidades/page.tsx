'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function EntidadesPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Formulario extendido con todos los parámetros financieros reales
  const [formData, setFormData] = useState({
    name: '',
    comisionSaaS: 2.5,
    tna: 120,
    tea: 145,
    cft: 180,
    punitorios: 50,
    moratorios: 50,
    gastosAdminPct: 3, 
    gastosOtorgamientoPct: 2,
    feeFijo: 0,
    seguroVida: 0.15,
    plazos: '6,12,18,24'
  });

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'entities'));
      const ents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntities(ents);
    } catch (error) {
      console.error("Error fetching entities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ent: any) => {
    const p = ent.parametros || {};
    setFormData({
      name: ent.name || '',
      comisionSaaS: ent.comisionSaaS || 2.5,
      tna: p.tna || 120,
      tea: p.tea || 145,
      cft: p.cft || 180,
      punitorios: p.punitorios || 50,
      moratorios: p.moratorios || 50,
      gastosAdminPct: p.gastosAdminPct || 3,
      gastosOtorgamientoPct: p.gastosOtorgamientoPct || 2,
      feeFijo: p.feeFijo || 0,
      seguroVida: p.seguroVida || 0.15,
      plazos: p.plazos || '6,12,18,24'
    });
    setCurrentId(ent.id);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar a la financiera ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'entities', id));
      setEntities(entities.filter(e => e.id !== id));
    } catch (error) {
      alert("Error al eliminar la entidad.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: formData.name,
      comisionSaaS: parseFloat(formData.comisionSaaS.toString()),
      parametros: {
        tna: parseFloat(formData.tna.toString()),
        tea: parseFloat(formData.tea.toString()),
        cft: parseFloat(formData.cft.toString()),
        punitorios: parseFloat(formData.punitorios.toString()),
        moratorios: parseFloat(formData.moratorios.toString()),
        gastosAdminPct: parseFloat(formData.gastosAdminPct.toString()),
        gastosOtorgamientoPct: parseFloat(formData.gastosOtorgamientoPct.toString()),
        feeFijo: parseFloat(formData.feeFijo.toString()),
        seguroVida: parseFloat(formData.seguroVida.toString()),
        plazos: formData.plazos
      },
      updatedAt: new Date().toISOString()
    };

    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, 'entities', currentId), payload);
        alert('Parametría actualizada con éxito.');
      } else {
        await addDoc(collection(db, 'entities'), { ...payload, createdAt: new Date().toISOString() });
        alert('Nueva financiera adherida.');
      }
      
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', comisionSaaS: 2.5, tna: 120, tea: 145, cft: 180, punitorios: 50, moratorios: 50, gastosAdminPct: 3, gastosOtorgamientoPct: 2, feeFijo: 0, seguroVida: 0.15, plazos: '6,12,18,24' });
      fetchEntities();
    } catch (error) {
      console.error("Error saving:", error);
      alert('Error al guardar los datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestor Avanzado de Entidades</h1>
          <p className="text-gray-500 mt-1">Control paramétrico de tasas, gastos, seguros y políticas comerciales.</p>
        </div>
        {isEditing && (
          <button onClick={() => { setIsEditing(false); setFormData({ name: '', comisionSaaS: 2.5, tna: 120, tea: 145, cft: 180, punitorios: 50, moratorios: 50, gastosAdminPct: 3, gastosOtorgamientoPct: 2, feeFijo: 0, seguroVida: 0.15, plazos: '6,12,18,24' }); }} className="text-blue-600 font-bold hover:underline">
            Cancelar Edición
          </button>
        )}
      </div>

      {/* FORMULARIO DE PARAMETRÍA AVANZADA */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center border-b pb-4">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          {isEditing ? `Editando Parametría: ${formData.name}` : 'Registrar Nueva Entidad'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SECCIÓN 1: Comercial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Comercial</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. PaySur Capital" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-900" />
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <label className="block text-xs font-bold text-green-800 uppercase mb-1">Tu Comisión SaaS (%)</label>
              <input required type="number" step="0.1" value={formData.comisionSaaS} onChange={e => setFormData({...formData, comisionSaaS: parseFloat(e.target.value)})} className="w-full px-3 py-1.5 border border-green-300 rounded focus:ring-2 focus:ring-green-500 outline-none font-bold text-green-900 bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-50 p-5 rounded-xl border border-gray-100">
            {/* SECCIÓN 2: Tasas */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-gray-800 border-b pb-2">Tasas de Interés</h3>
              <div><label className="block text-xs text-gray-500 mb-1">TNA (%)</label><input type="number" step="0.1" value={formData.tna} onChange={e => setFormData({...formData, tna: parseFloat(e.target.value)})} className="w-full p-2 border rounded" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">TEA (%)</label><input type="number" step="0.1" value={formData.tea} onChange={e => setFormData({...formData, tea: parseFloat(e.target.value)})} className="w-full p-2 border rounded" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">CFT (%)</label><input type="number" step="0.1" value={formData.cft} onChange={e => setFormData({...formData, cft: parseFloat(e.target.value)})} className="w-full p-2 border rounded" /></div>
            </div>

            {/* SECCIÓN 3: Gastos y Seguros */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-gray-800 border-b pb-2">Gastos (Porcentuales)</h3>
              <div><label className="block text-xs text-gray-500 mb-1">Admin. y Gestión (%)</label><input type="number" step="0.1" value={formData.gastosAdminPct} onChange={e => setFormData({...formData, gastosAdminPct: parseFloat(e.target.value)})} className="w-full p-2 border rounded" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Otorgamiento (%)</label><input type="number" step="0.1" value={formData.gastosOtorgamientoPct} onChange={e => setFormData({...formData, gastosOtorgamientoPct: parseFloat(e.target.value)})} className="w-full p-2 border rounded" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Seguro de Vida (%)</label><input type="number" step="0.01" value={formData.seguroVida} onChange={e => setFormData({...formData, seguroVida: parseFloat(e.target.value)})} className="w-full p-2 border rounded" /></div>
            </div>

            {/* SECCIÓN 4: Moras y Extras */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-gray-800 border-b pb-2">Políticas y Moras</h3>
              <div><label className="block text-xs text-gray-500 mb-1">Interés Punitorio (%)</label><input type="number" step="0.1" value={formData.punitorios} onChange={e => setFormData({...formData, punitorios: parseFloat(e.target.value)})} className="w-full p-2 border rounded" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Interés Moratorio (%)</label><input type="number" step="0.1" value={formData.moratorios} onChange={e => setFormData({...formData, moratorios: parseFloat(e.target.value)})} className="w-full p-2 border rounded" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Fee Fijo (Opcional $)</label><input type="number" value={formData.feeFijo} onChange={e => setFormData({...formData, feeFijo: parseFloat(e.target.value)})} className="w-full p-2 border rounded" /></div>
            </div>

            {/* SECCIÓN 5: Plazos */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-gray-800 border-b pb-2">Planes Comerciales</h3>
              <div>
                  <label className="block text-xs text-gray-500 mb-1">Plazos Permitidos (Meses)</label>
                  <input type="text" value={formData.plazos} onChange={e => setFormData({...formData, plazos: e.target.value})} placeholder="Ej. 6,12,18,24" className="w-full p-2 border rounded border-blue-300 focus:ring-blue-500" />
                  <p className="text-[10px] text-gray-400 mt-1">Separados por comas. El simulador solo mostrará estos plazos.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-300 flex items-center">
              {loading ? <span className="animate-spin h-5 w-5 border-t-2 border-white rounded-full mr-2"></span> : null}
              {isEditing ? 'Actualizar Reglas de Negocio' : 'Registrar Entidad'}
            </button>
          </div>
        </form>
      </div>

      {/* LISTADO DE ENTIDADES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entities.map(ent => (
          <div key={ent.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold text-white truncate">{ent.name}</h3>
              <div className="flex space-x-1">
                 <button onClick={() => handleEdit(ent)} className="text-gray-300 hover:text-white p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                 <button onClick={() => handleDelete(ent.id, ent.name)} className="text-red-400 hover:text-red-300 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
              </div>
            </div>
            <div className="p-5 text-sm space-y-3">
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">TNA / TEA / CFT</span><span className="font-bold text-gray-900">{ent.parametros?.tna}% / {ent.parametros?.tea}% / {ent.parametros?.cft}%</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Gastos (Admin+Otorg)</span><span className="font-bold text-gray-900">{(ent.parametros?.gastosAdminPct || 0) + (ent.parametros?.gastosOtorgamientoPct || 0)}%</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Plazos</span><span className="font-bold text-blue-600">{ent.parametros?.plazos}</span></div>
              <div className="flex justify-between pt-1"><span className="text-green-700 font-bold text-xs uppercase">SaaS Fee</span><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">{ent.comisionSaaS || 0}%</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
