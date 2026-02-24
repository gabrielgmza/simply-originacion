'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function EntidadesPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Formulario de parámetros de la financiera
  const [formData, setFormData] = useState({
    name: '',
    tna: 120,
    gastosAdmin: 5000,
    seguroVida: 0.15,
    comisionSaaS: 2.5 // El % que tú cobras por usar la plataforma
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
    setFormData({
      name: ent.name || '',
      tna: ent.parametros?.tna || 120,
      gastosAdmin: ent.parametros?.gastosAdmin || 0,
      seguroVida: ent.parametros?.seguroVida || 0,
      comisionSaaS: ent.comisionSaaS || 2.5
    });
    setCurrentId(ent.id);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar a la financiera ${name}? Esto no afectará las operaciones históricas.`)) return;
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
        gastosAdmin: parseFloat(formData.gastosAdmin.toString()),
        seguroVida: parseFloat(formData.seguroVida.toString())
      },
      updatedAt: new Date().toISOString()
    };

    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, 'entities', currentId), payload);
        alert('Condiciones de la financiera actualizadas con éxito.');
      } else {
        await addDoc(collection(db, 'entities'), { ...payload, createdAt: new Date().toISOString() });
        alert('Nueva financiera adherida a SimplySaaS.');
      }
      
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', tna: 120, gastosAdmin: 5000, seguroVida: 0.15, comisionSaaS: 2.5 });
      fetchEntities();
    } catch (error) {
      console.error("Error saving:", error);
      alert('Error al guardar los datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Financieras</h1>
          <p className="text-gray-500 mt-1">Configura las tasas, gastos y tu comisión SaaS por entidad.</p>
        </div>
        {isEditing && (
          <button onClick={() => { setIsEditing(false); setFormData({ name: '', tna: 120, gastosAdmin: 5000, seguroVida: 0.15, comisionSaaS: 2.5 }); }} className="text-blue-600 font-bold hover:underline">
            Cancelar Edición
          </button>
        )}
      </div>

      {/* FORMULARIO DE PARAMETRÍA */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center border-b pb-4">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          {isEditing ? `Editando Parametría: ${formData.name}` : 'Adherir Nueva Financiera'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre Comercial</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. PaySur Capital" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">TNA (%)</label>
              <div className="relative">
                <input required type="number" step="0.1" value={formData.tna} onChange={e => setFormData({...formData, tna: parseFloat(e.target.value)})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-8" />
                <span className="absolute right-3 top-3.5 text-gray-400 font-bold">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Gastos Admin ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-gray-400 font-bold">$</span>
                <input required type="number" value={formData.gastosAdmin} onChange={e => setFormData({...formData, gastosAdmin: parseFloat(e.target.value)})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pl-8" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Seguro Vida (%)</label>
              <div className="relative">
                <input required type="number" step="0.01" value={formData.seguroVida} onChange={e => setFormData({...formData, seguroVida: parseFloat(e.target.value)})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-8" />
                <span className="absolute right-3 top-3.5 text-gray-400 font-bold">%</span>
              </div>
            </div>

          </div>

          <div className="bg-green-50 p-4 rounded-xl border border-green-200 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-green-900">Comisión SaaS Simply (Tu Negocio)</h4>
              <p className="text-xs text-green-700 mt-1">Porcentaje que le cobrarás a esta financiera por cada crédito liquidado.</p>
            </div>
            <div className="w-32 relative">
               <input required type="number" step="0.1" value={formData.comisionSaaS} onChange={e => setFormData({...formData, comisionSaaS: parseFloat(e.target.value)})} className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-green-900 font-bold pr-8 text-right bg-white" />
               <span className="absolute right-3 top-2.5 text-green-600 font-bold">%</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-300 flex items-center">
              {loading ? <span className="animate-spin h-5 w-5 border-t-2 border-white rounded-full mr-2"></span> : null}
              {isEditing ? 'Guardar Cambios' : 'Registrar Financiera'}
            </button>
          </div>
        </form>
      </div>

      {/* LISTADO DE ENTIDADES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entities.map(ent => (
          <div key={ent.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 truncate">{ent.name}</h3>
              <div className="flex space-x-2">
                 <button onClick={() => handleEdit(ent)} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                 <button onClick={() => handleDelete(ent.id, ent.name)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs uppercase font-bold">TNA</p>
                  <p className="font-black text-gray-800 text-lg">{ent.parametros?.tna || 0}%</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase font-bold">Seguro</p>
                  <p className="font-bold text-gray-800">{ent.parametros?.seguroVida || 0}% <span className="text-xs font-normal">/mes</span></p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs uppercase font-bold">Gastos Admin. Fijos</p>
                  <p className="font-bold text-gray-800">${(ent.parametros?.gastosAdmin || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-dashed border-gray-200">
                <p className="flex justify-between items-center text-sm">
                  <span className="text-green-700 font-bold">Comisión SaaS:</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">{ent.comisionSaaS || 0}%</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
