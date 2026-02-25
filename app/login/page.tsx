"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";
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

      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data() as UsuarioApp;

        if (!userData.activo) {
          setError("Tu cuenta se encuentra inactiva. Contacta a tu administrador.");
          setLoading(false);
          return;
        }

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
      } else {
        setError("Usuario autenticado pero sin perfil asignado en el sistema.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Credenciales inválidas o error de conexión.");
    } finally {
      if (!error) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans selection:bg-[#FF5E14] selection:text-white">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Simply Core</h1>
          <p className="text-gray-400 text-sm">Plataforma de Originación Crediticia</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-900 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#111] border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#FF5E14] transition-colors"
                placeholder="usuario@entidad.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#111] border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#FF5E14] transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF5E14] hover:bg-[#E04D0B] text-white font-bold py-3.5 rounded-xl transition-colors mt-4 flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Ingresar al Sistema"}
          </button>
        </form>
      </div>
    </div>
  );
}
