'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.push('/dashboard');
      else router.push('/login');
    });
    return () => unsub();
  }, [router]);

  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
