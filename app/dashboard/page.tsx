'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null); // Guardamos el rol aquí
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ entidades: 0, usuarios: 0, volumen: 0 });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserProfileAndStats(currentUser.email);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadUserProfileAndStats = async (email: string | null) => {
    if (!email) return;

    try {
      // 1. Identificar quién es el que entró (Buscamos su rol en BD)
      let currentRole = 'SUPER_ADMIN'; // Por defecto si eres tú (ggaldeano@paysur.com)
      
      const qUser = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const snapUser = await getDocs(qUser);
      
      if (!snapUser.empty) {
        const profileData = snapUser.docs[0].data();
        setUserProfile(profileData);
        currentRole = profileData.role;
      } else if (email === 'ggaldeano@paysur.com') {
         // Si eres tú, forzamos Súper Admin aunque no estés en la tabla users
         setUserProfile({ role: 'SUPER_ADMIN', name: 'Gabriel (Súper Admin)' });
      }

      // 2. Cargar Estadísticas (Filtradas por Rol)
      let entCount = 0;
      let usrCount = 0;
      let volTotal = 0;

      // Si es Super Admin, ve TODO
      if (currentRole === 'SUPER_ADMIN') {
        const entSnap = await getDocs(collection(db, 'entities'));
        entCount = entSnap.size;
        
        const usrSnap = await getDocs(collection(db, 'users'));
        usrCount = usrSnap.size;
        
        const opSnap = await getDocs(collection(db, 'operaciones'));
        opSnap.forEach(doc => {
          if (doc.data().estado !== 'RECHAZADA') volTotal += doc.data().montoSolicitado || 0;
        });
      } 
      // Si es Gerente o Vendedor, ve datos filtrados
      else if (currentRole === 'GERENTE_ENTIDAD' || currentRole === 'VENDEDOR') {
        const myEntityId = snapUser.docs[0].data().entityId;
        
        // Solo ve operaciones de su entidad (Gerente) o de sí mismo (Vendedor)
        let qOps = query(collection(db, 'operaciones'), where('entidadId', '==', myEntityId));
        if (currentRole === 'VENDEDOR') {
           qOps = query(collection(db, 'operaciones'), where('vendedorEmail', '==', email));
        }
        
        const opSnap = await getDocs(qOps);
        opSnap.forEach(doc => {
          if (doc.data().estado !== 'RECHAZADA') volTotal += doc.data().montoSolicitado || 0;
        });
        
        // Las tarjetas de Entidades y Usuarios no aplican para Vendedores
      }

      setStats({ entidades: entCount, usuarios: usrCount, volumen: volTotal });
      
    } catch (error) {
      console.error("Error al cargar perfil/stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      document.cookie = 'firebase-auth-token=; path=/; max-age=0;';
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Permisos visuales basados en el rol
  const isSuperAdmin = userProfile?.role === 'SUPER_ADMIN';
  const isGerente = userProfile?.role === 'GERENTE_ENTIDAD';
  const isVendedor = userProfile?.role === 'VENDEDOR';

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">Simply Originación <span className="text-sm font-normal text-gray-500 ml-2">| Panel {userProfile?.role?.replace('_', ' ')}</span></h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-900 font-medium">{userProfile?.name || 'Usuario'}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors bg-red-50 px-3 py-1.5 rounded-md ml-4"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        
        {/* Mensaje de bienvenida personalizado */}
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Hola, {userProfile?.name?.split(' ')[0] || 'equipo'}</h2>
            <p className="text-gray-500">Este es tu resumen de operaciones.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Tarjetas SOLO visibles para Súper Admin */}
          {isSuperAdmin && (
            <>
              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl><dt className="text-sm font-medium text-gray-500 truncate">Entidades SaaS</dt><dd className="text-2xl font-semibold text-gray-900">{stats.entidades}</dd></dl>
                    </div>
                  </div>
                </div>
                <Link href="/dashboard/entidades" className="bg-gray-50 px-5 py-3 border-t border-gray-200 hover:bg-gray-100 transition-colors flex justify-between group">
                  <span className="text-sm text-blue-700 font-medium group-hover:text-blue-900">Gestionar entidades</span><span className="text-blue-500 group-hover:text-blue-700">&rarr;</span>
                </Link>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl><dt className="text-sm font-medium text-gray-500 truncate">Usuarios</dt><dd className="text-2xl font-semibold text-gray-900">{stats.usuarios}</dd></dl>
                    </div>
                  </div>
                </div>
                <Link href="/dashboard/usuarios" className="bg-gray-50 px-5 py-3 border-t border-gray-200 hover:bg-gray-100 transition-colors flex justify-between group">
                  <span className="text-sm text-blue-700 font-medium group-hover:text-blue-900">Ver usuarios</span><span className="text-blue-500 group-hover:text-blue-700">&rarr;</span>
                </Link>
              </div>
            </>
          )}

          {/* Tarjeta de Volumen (Visible para todos, pero calcula distinto) */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{isVendedor ? 'Mis Ventas (Mes)' : 'Volumen Originado'}</dt>
                    <dd className="text-2xl font-semibold text-gray-900">${stats.volumen.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <Link href="/dashboard/operaciones" className="bg-gray-50 px-5 py-3 border-t border-gray-200 hover:bg-gray-100 transition-colors flex justify-between group">
              <span className="text-sm text-blue-700 font-medium group-hover:text-blue-900">Ir a operaciones</span><span className="text-blue-500 group-hover:text-blue-700">&rarr;</span>
            </Link>
          </div>

          {/* Tarjeta 4: Nueva Originacion (Visible para todos) */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-800 overflow-hidden shadow-lg rounded-lg border border-blue-500 flex flex-col transform transition-transform hover:scale-105">
            <div className="p-5 flex-1">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-white/20 rounded-md p-3 backdrop-blur-sm">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl><dt className="text-sm font-medium text-blue-100 truncate">Originación</dt><dd className="text-xl font-bold text-white">Nueva Operación</dd></dl>
                </div>
              </div>
            </div>
            <Link href="/dashboard/originacion" className="bg-black/20 px-5 py-3 border-t border-white/10 hover:bg-black/30 transition-colors flex justify-between group">
              <span className="text-sm text-white font-medium">Iniciar simulador</span><span className="text-white opacity-70 group-hover:opacity-100">&rarr;</span>
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
