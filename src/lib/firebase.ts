import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
<<<<<<< HEAD

// Configuración de Firebase usando variables de entorno
=======
import { getAnalytics, isSupported } from 'firebase/analytics';

// Las credenciales ahora vivirán seguras en la configuración de Vercel
>>>>>>> b677a287dd9a31b7bf4aec69c92915cdfd1a3c69
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

<<<<<<< HEAD
// Inicializar Firebase (Singleton: evita inicializaciones múltiples)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportar servicios esenciales
=======
// Inicializar Firebase solo si no se ha inicializado antes (evita errores en Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportar los servicios para usarlos en el resto del proyecto
>>>>>>> b677a287dd9a31b7bf4aec69c92915cdfd1a3c69
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

<<<<<<< HEAD
export default app;
=======
// Inicializar Analytics solo si estamos en el navegador
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export default app;
>>>>>>> b677a287dd9a31b7bf4aec69c92915cdfd1a3c69
