"use client";
// app/login/page.tsx
import { useState, Suspense } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";

// useSearchParams requiere Suspense en Next.js 15
function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") || null;

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ uid: cred.user.uid }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al iniciar sesión"); await auth.signOut(); return; }
      router.push(redirect || data.destino || "/dashboard");
    } catch (err: any) {
      const mensajes: Record<string, string> = {
        "auth/user-not-found":     "Usuario no encontrado.",
        "auth/wrong-password":     "Contraseña incorrecta.",
        "auth/invalid-credential": "Credenciales inválidas.",
        "auth/too-many-requests":  "Demasiados intentos. Esperá unos minutos.",
      };
      setError(mensajes[err.code] || "Error de conexión. Intentá de nuevo.");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleLogin} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="space-y-1">
        <label className="text-xs text-gray-500 uppercase font-bold tracking-widest">Email</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full bg-black border border-gray-800 rounded-xl pl-9 pr-3 py-3 text-white text-sm outline-none focus:border-gray-600"
            placeholder="usuario@entidad.com"/>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-gray-500 uppercase font-bold tracking-widest">Contraseña</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full bg-black border border-gray-800 rounded-xl pl-9 pr-3 py-3 text-white text-sm outline-none focus:border-gray-600"
            placeholder="••••••••"/>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs p-3 bg-red-900/10 rounded-xl border border-red-900/30">
          <AlertCircle size={13} className="shrink-0"/>{error}
        </div>
      )}
      <button type="submit" disabled={loading}
        className="w-full py-3 rounded-xl font-black text-white bg-orange-500 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
        {loading ? <><Loader2 size={15} className="animate-spin"/> Ingresando...</> : "Ingresar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-3xl font-black text-white tracking-tighter">Paysur</p>
          <p className="text-gray-500 text-sm mt-1">Ingresá a tu cuenta</p>
        </div>
        <Suspense fallback={<div className="h-48 bg-[#0A0A0A] border border-gray-800 rounded-2xl animate-pulse"/>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
