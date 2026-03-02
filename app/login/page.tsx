"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, AlertCircle, ShieldOff } from "lucide-react";
import { UsuarioApp } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 1. Obtener perfil del usuario
      const userSnap = await getDoc(doc(db, "usuarios", user.uid));

      if (!userSnap.exists()) {
        await auth.signOut();
        setError("Usuario sin perfil asignado. Contactá a tu administrador.");
        setLoading(false);
        return;
      }

      const userData = userSnap.data() as UsuarioApp;

      // 2. Verificar si el usuario está activo
      if (!userData.activo) {
        await auth.signOut();
        setError("Tu cuenta está inactiva. Contactá a tu administrador.");
        setLoading(false);
        return;
      }

      // 3. Si tiene entidad asignada, verificar que NO esté bloqueada
      if (userData.entidadId && userData.rol !== "MASTER_PAYSUR") {
        const entidadSnap = await getDoc(doc(db, "entidades", userData.entidadId));

        if (entidadSnap.exists()) {
          const entidad = entidadSnap.data();
          if (entidad.activa === false) {
            await auth.signOut();
            setError("Tu organización está temporalmente suspendida. Contactá a soporte.");
            setLoading(false);
            return;
          }
        }
      }

      // 4. Redirigir según rol
      switch (userData.rol) {
        case "MASTER_PAYSUR":
          router.push("/admin");
          break;
        case "GERENTE_GENERAL":
        case "GERENTE_SUCURSAL":
          router.push("/dashboard/gerencia");
          break;
        case "VENDEDOR":
          router.push("/dashboard/originacion");
          break;
        case "LIQUIDADOR":
          router.push("/dashboard/operaciones");
          break;
        default:
          router.push("/dashboard");
      }

    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Email o contraseña incorrectos.");
      } else {
        setError("Error de conexión. Intentá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="bg-[#FF5E14] text-white font-black px-3 py-1.5 rounded-lg text-xl">S</div>
            <span className="text-white font-black italic text-2xl tracking-tight">Simply</span>
          </div>
          <p className="text-gray-500 text-sm">Plataforma de Originación de Créditos</p>
        </div>

        {/* Card */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-6">Iniciar sesión</h1>

          {/* Error */}
          {error && (
            <div className="mb-5 p-4 bg-red-900/20 border border-red-800/50 rounded-xl flex items-start gap-3">
              {error.includes("suspendida") ? (
                <ShieldOff size={18} className="text-red-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              )}
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-[#111] border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-gray-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="password" required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#111] border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-gray-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-[#FF5E14] hover:bg-[#E04D0B] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">Simply by PaySur © 2026</p>
      </div>
    </div>
  );
}
