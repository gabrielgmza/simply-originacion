'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, getDocs, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';

export default function EntidadDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const [entity, setEntity] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados nueva sucursal
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  // Estados edición de entidad
  const [editName, setEditName] = useState('');
  const [editCuit, setEditCuit] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return router.push('/login');
      loadData();
    });
    return () => unsubscribe();
  }, [id, router]);

  const loadData = async () => {
    try {
      const docRef = doc(db, 'entities', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEntity({ id: docSnap.id, ...data });
        setEditName(data.name || '');
        setEditCuit(data.cuit || '');
      } else {
        router.push('/dashboard/entidades');
      }

      const branchesRef = collection(db, 'entities', id, 'branches');
      const q = query(branchesRef);
      const snapshot = await getDocs(q);
      setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = doc(db, 'entities', id);
      await updateDoc(docRef, { name: editName, cuit: editCuit });
      alert('Entidad actualizada correctamente');
      loadData();
    } catch (error) {
      console.error("Error actualizando:", error);
      alert('Error al actualizar');
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const branchesRef = collection(db, 'entities', id, 'branches');
      await addDoc(branchesRef, {
        name: branchName,
        address: branchAddress,
        createdAt: serverTimestamp()
      });
      setBranchName(''); setBranchAddress('');
      loadData();
    } catch (error) {
      console.error("Error agregando sucursal:", error);
      alert("Error al guardar la sucursal");
    }
  };

  if (loading) return <div className="p-10 text-center text-black">Cargando detalles...</div>;
  if (!entity) return <div className="p-10 text-center text-black">Entidad no encontrada.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto text-black bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">{entity.name}</h1>
          <p className="text-sm text-gray-500">Gestión de detalles y sucursales</p>
        </div>
        <button onClick={() => router.push('/dashboard/entidades')} className="text-blue-600 hover:underline">
          &larr; Volver a Entidades
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Bloque: Editar Entidad */}
        <div className="bg-white p-6 shadow rounded-lg h-fit">
          <h2 className="font-bold text-lg mb-4 border-b pb-2">Datos de la Entidad</h2>
          <form onSubmit={handleUpdateEntity}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social</label>
              <input required value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full p-2 border rounded" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
              <input required value={editCuit} onChange={e => setEditCuit(e.target.value)}
                className="w-full p-2 border rounded" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors">
              Actualizar Datos
            </button>
          </form>
        </div>

        {/* Bloque: Sucursales */}
        <div className="space-y-6">
          <div className="bg-white p-6 shadow rounded-lg">
            <h2 className="font-bold text-lg mb-4 border-b pb-2">Agregar Sucursal</h2>
            <form onSubmit={handleAddBranch} className="flex flex-col space-y-3">
              <input required placeholder="Nombre (ej. Casa Central)" value={branchName} onChange={e => setBranchName(e.target.value)}
                className="w-full p-2 border rounded" />
              <input placeholder="Dirección (Opcional)" value={branchAddress} onChange={e => setBranchAddress(e.target.value)}
                className="w-full p-2 border rounded" />
              <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors">
                Añadir Sucursal
              </button>
            </form>
          </div>

          <div className="bg-white p-6 shadow rounded-lg">
            <h2 className="font-bold text-lg mb-4 border-b pb-2">Sucursales Activas</h2>
            {branches.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No hay sucursales registradas.</p>
            ) : (
              <ul className="divide-y">
                {branches.map(branch => (
                  <li key={branch.id} className="py-3 flex flex-col">
                    <span className="font-medium text-sm">{branch.name}</span>
                    {branch.address && <span className="text-xs text-gray-500">{branch.address}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
