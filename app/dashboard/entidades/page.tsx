'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, serverTimestamp, query } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

export default function EntidadesPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [cuit, setCuit] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return router.push('/login');
      fetchEntities();
    });
    return () => unsubscribe();
  }, [router]);

  const fetchEntities = async () => {
    try {
      const q = query(collection(db, 'entities'));
      const snapshot = await getDocs(q);
      setEntities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error al cargar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'entities'), {
        name,
        cuit,
        isActive: true,
        createdAt: serverTimestamp()
      });
      setName(''); setCuit('');
      fetchEntities();
    } catch (error) {
      alert("Error al guardar en Firestore");
    }
  };

  if (loading) return <div className="p-10 text-center text-black">Cargando módulo...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto text-black bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Gestión de Entidades</h1>
        <button onClick={() => router.push('/dashboard')} className="text-blue-600 hover:underline">
          &larr; Volver al Panel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <form onSubmit={handleSave} className="bg-white p-6 shadow rounded-lg h-fit">
          <h2 className="font-bold mb-4">Nueva Financiera</h2>
          <input required placeholder="Razón Social" value={name} onChange={e => setName(e.target.value)}
            className="w-full mb-3 p-2 border rounded" />
          <input required placeholder="CUIT" value={cuit} onChange={e => setCuit(e.target.value)}
            className="w-full mb-4 p-2 border rounded" />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors">
            Guardar Entidad
          </button>
        </form>

        <div className="md:col-span-2 bg-white p-6 shadow rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="pb-2">Nombre</th>
                <th className="pb-2">CUIT</th>
                <th className="pb-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {entities.map(ent => (
                <tr 
                  key={ent.id} 
                  className="border-b hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/entidades/${ent.id}`)}
                >
                  <td className="py-3 font-medium text-blue-600">{ent.name}</td>
                  <td className="py-3 text-gray-600">{ent.cuit}</td>
                  <td className="py-3"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Activa</span></td>
                </tr>
              ))}
              {entities.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-gray-500">Sin entidades registradas</td></tr>
              )}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-4 text-center">Haz clic en una entidad para administrarla</p>
        </div>
      </div>
    </div>
  );
}
