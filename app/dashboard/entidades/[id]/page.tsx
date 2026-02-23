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

  // Estados para configuración financiera
  const [tna, setTna] = useState('120');
  const [gastosAdmin, setGastosAdmin] = useState('5000');
  const [seguroVida, setSeguroVida] = useState('0.15');

  // NUEVO: Estados para credenciales del Scraper (Gobierno)
  const [cuadUser, setCuadUser] = useState('');
  const [cuadPassword, setCuadPassword] = useState('');

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
        
        // Cargar parámetros si existen
        if (data.parametros) {
            setTna(data.parametros.tna?.toString() || '120');
            setGastosAdmin(data.parametros.gastosAdmin?.toString() || '5000');
            setSeguroVida(data.parametros.seguroVida?.toString() || '0.15');
        }
        
        // Cargar credenciales si existen
        if (data.credenciales) {
            setCuadUser(data.credenciales.cuadUser || '');
            setCuadPassword(data.credenciales.cuadPassword || '');
        }
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
      await updateDoc(docRef, { 
          name: editName, 
          cuit: editCuit,
          parametros: {
              tna: parseFloat(tna),
              gastosAdmin: parseFloat(gastosAdmin),
              seguroVida: parseFloat(seguroVida)
          },
          // Guardamos las credenciales del gobierno (En prod real irían encriptadas)
          credenciales: {
              cuadUser: cuadUser,
              cuadPassword: cuadPassword
          }
      });
      alert('Configuración guardada correctamente. El motor de originación ya puede usar estos datos.');
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
          <p className="text-sm text-gray-500">Gestión de detalles, parámetros y sucursales</p>
        </div>
        <button onClick={() => router.push('/dashboard/entidades')} className="text-blue-600 hover:underline">
          &larr; Volver a Entidades
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Bloque: Editar Entidad y Parámetros */}
        <div className="bg-white p-6 shadow rounded-lg h-fit space-y-6">
          <form onSubmit={handleUpdateEntity}>
            <h2 className="font-bold text-lg mb-4 border-b pb-2">Datos Comerciales</h2>
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

            <h2 className="font-bold text-lg mt-6 mb-4 border-b pb-2">Parámetros Financieros</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TNA (%)</label>
                  <input type="number" step="0.01" required value={tna} onChange={e => setTna(e.target.value)}
                    className="w-full p-2 border rounded bg-blue-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seguro de Vida (%)</label>
                  <input type="number" step="0.01" required value={seguroVida} onChange={e => setSeguroVida(e.target.value)}
                    className="w-full p-2 border rounded bg-blue-50 focus:bg-white" />
                </div>
            </div>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Gastos Administrativos ($)</label>
                <input type="number" step="0.01" required value={gastosAdmin} onChange={e => setGastosAdmin(e.target.value)}
                  className="w-full p-2 border rounded bg-blue-50 focus:bg-white" />
            </div>

            {/* NUEVO: Bloque de Credenciales del Gobierno */}
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
              <h2 className="font-bold text-white mb-4 border-b border-gray-600 pb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                Conexión CUAD (Gobierno)
              </h2>
              <p className="text-xs text-gray-400 mb-4">Estas credenciales serán usadas por el robot para extraer el margen de los clientes automáticamente.</p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Usuario CUAD</label>
                  <input type="text" value={cuadUser} onChange={e => setCuadUser(e.target.value)}
                    className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500" placeholder="Ej. jperez_cuad" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Contraseña CUAD</label>
                  <input type="password" value={cuadPassword} onChange={e => setCuadPassword(e.target.value)}
                    className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500" placeholder="••••••••" />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
              Guardar Configuración
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
