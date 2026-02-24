'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, updatePassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

export default function ConfiguracionPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        try {
          const qUser = query(collection(db, 'users'), where('email', '==', user.email.toLowerCase()));
          const snapUser = await getDocs(qUser);
          if (!snapUser.empty) {
            setUserProfile({ uid: user.uid, email: user.email, ...snapUser.docs[0].data() });
          } else {
            setUserProfile({ uid: user.uid, email: user.email, role: 'Sin Asignar' });
          }
        } catch (error) {
          console.error("Error cargando perfil", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || newPassword.length < 6) return alert('La contraseña debe tener al menos 6 caracteres.');
    
    try {
      await updatePassword(auth.currentUser, newPassword);
      setMessage('¡Contraseña actualizada con éxito!');
      setNewPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        alert('Por seguridad, debes cerrar sesión y volver a entrar para cambiar tu contraseña.');
      } else {
        alert('Error al actualizar contraseña.');
      }
    }
  };

  if (loading) return <div className="text-center p-10">Cargando perfil...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración de Cuenta</h1>
        <p className="text-gray-500 mt-1">Gestiona tus preferencias y seguridad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* TARJETA DE PERFIL */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-inner mb-4">
              {userProfile?.email?.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-gray-900 truncate w-full">{userProfile?.email}</h2>
            <span className="mt-2 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Rol: {userProfile?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* AJUSTES Y SEGURIDAD */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              Seguridad y Contraseña
            </h3>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
                />
              </div>
              <button 
                type="submit" 
                disabled={newPassword.length < 6}
                className="bg-gray-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300"
              >
                Actualizar Contraseña
              </button>
              {message && <p className="text-green-600 font-bold text-sm mt-2">{message}</p>}
            </form>
          </div>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
             <h3 className="text-lg font-bold text-blue-900 mb-2">Soporte Técnico</h3>
             <p className="text-blue-700 text-sm">Si necesitas cambiar la entidad a la que perteneces o solicitar reportes históricos, comunícate con el Administrador de SimplySaaS.</p>
             <button className="mt-4 bg-white text-blue-700 border border-blue-200 font-bold py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors text-sm">
               Contactar Soporte
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
