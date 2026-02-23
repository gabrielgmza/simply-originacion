'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, serverTimestamp, query } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados del formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VENDEDOR');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return router.push('/login');
      loadInitialData();
    });
    return () => unsubscribe();
  }, [router]);

  const loadInitialData = async () => {
    try {
      // Cargar Usuarios (Registros de perfiles en base de datos)
      const uQuery = query(collection(db, 'users'));
      const uSnap = await getDocs(uQuery);
      setUsers(uSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Cargar Entidades para el selector
      const eQuery = query(collection(db, 'entities'));
      const eSnap = await getDocs(eQuery);
      setEntities(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error al cargar:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar sucursales cuando se selecciona una entidad
  useEffect(() => {
    const fetchBranches = async () => {
      if (!selectedEntity) {
        setBranches([]);
        return;
      }
      const bRef = collection(db, 'entities', selectedEntity, 'branches');
      const bSnap = await getDocs(query(bRef));
      setBranches(bSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchBranches();
  }, [selectedEntity]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Guardamos el perfil del usuario en Firestore (Más adelante lo conectaremos con Auth)
      await addDoc(collection(db, 'users'), {
        name,
        email,
        role,
        entityId: selectedEntity || null,
        branchId: selectedBranch || null,
        isActive: true,
        createdAt: serverTimestamp()
      });
      
      setName(''); setEmail(''); setSelectedEntity(''); setSelectedBranch('');
      loadInitialData();
    } catch (error) {
      alert("Error al guardar el usuario en Firestore");
    }
  };

  if (loading) return <div className="p-10 text-center text-black">Cargando módulo...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto text-black bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500">Asigna roles y ubicaciones al personal</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-blue-600 hover:underline">
          &larr; Volver al Panel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Formulario */}
        <form onSubmit={handleSave} className="bg-white p-6 shadow rounded-lg h-fit space-y-4">
          <h2 className="font-bold border-b pb-2">Nuevo Usuario</h2>
          
          <input required placeholder="Nombre Completo" value={name} onChange={e => setName(e.target.value)}
            className="w-full p-2 border rounded text-sm" />
            
          <input required type="email" placeholder="Correo Electrónico" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full p-2 border rounded text-sm" />
            
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 border rounded text-sm">
            <option value="GERENTE_ENTIDAD">Gerente General</option>
            <option value="SUPERVISOR">Supervisor de Sucursal</option>
            <option value="VENDEDOR">Vendedor / Operador</option>
          </select>

          <select required value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)} className="w-full p-2 border rounded text-sm">
            <option value="">-- Seleccionar Entidad --</option>
            {entities.map(ent => (
              <option key={ent.id} value={ent.id}>{ent.name}</option>
            ))}
          </select>

          {selectedEntity && (
            <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="w-full p-2 border rounded text-sm">
              <option value="">-- Seleccionar Sucursal (Opcional) --</option>
              {branches.map(br => (
                <option key={br.id} value={br.id}>{br.name}</option>
              ))}
            </select>
          )}

          <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors">
            Registrar Usuario
          </button>
        </form>

        {/* Tabla */}
        <div className="md:col-span-2 bg-white p-6 shadow rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="pb-2 text-sm font-semibold text-gray-600">Nombre / Email</th>
                <th className="pb-2 text-sm font-semibold text-gray-600">Rol</th>
                <th className="pb-2 text-sm font-semibold text-gray-600">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const entityName = entities.find(e => e.id === u.entityId)?.name || 'N/A';
                return (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">
                      <div className="font-medium text-sm">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="py-3">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-gray-600">{entityName}</td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-gray-500 text-sm">Sin usuarios registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
