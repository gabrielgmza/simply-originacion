'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">Simply Originación <span className="text-sm font-normal text-gray-500 ml-2">| Panel Súper Admin</span></h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors bg-red-50 px-3 py-1.5 rounded-md"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tarjeta 1: Entidades */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Entidades (Financieras)</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">0</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <Link href="/dashboard/entidades" className="bg-gray-50 px-5 py-3 border-t border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-between group">
              <span className="text-sm text-blue-700 font-medium group-hover:text-blue-900">Gestionar entidades</span>
              <span className="text-blue-500 group-hover:text-blue-700">&rarr;</span>
            </Link>
          </div>

          {/* Tarjeta 2: Usuarios Activos */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Usuarios del Sistema</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">1</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <Link href="#" className="bg-gray-50 px-5 py-3 border-t border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-between group">
              <span className="text-sm text-blue-700 font-medium group-hover:text-blue-900">Ver usuarios (Próximamente)</span>
              <span className="text-blue-500 group-hover:text-blue-700">&rarr;</span>
            </Link>
          </div>

          {/* Tarjeta 3: Volumen de Créditos */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Volumen Originado (Mes)</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">$0.00</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <Link href="#" className="bg-gray-50 px-5 py-3 border-t border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-between group">
              <span className="text-sm text-blue-700 font-medium group-hover:text-blue-900">Reporte global (Próximamente)</span>
              <span className="text-blue-500 group-hover:text-blue-700">&rarr;</span>
            </Link>
          </div>

        </div>

        <div className="mt-8 bg-white shadow rounded-lg border border-gray-100">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Bienvenido al sistema Multi-Tenant</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Desde este panel podrás crear nuevas financieras (Entidades), asignarles sus sucursales y configurar sus parámetros (fees, colores, logo). Estás viendo la vista global de Super Administrador de PaySur.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
