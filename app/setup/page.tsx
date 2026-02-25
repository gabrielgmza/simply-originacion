"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const handleCreateMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "usuarios", user.uid), {
        uid: user.uid,
        email: email,
        nombre: nombre,
        rol: "MASTER_PAYSUR",
        entidadId: "PAYSUR_CORE",
        activo: true,
        fechaCreacion: serverTimestamp()
      });

      setMensaje("Cuenta MASTER creada con exito. Redirigiendo al Admin...");
      setTimeout(() => {
        router.push("/admin");
      }, 2000);

    } catch (error: any) {
      console.error(error);
      setMensaje("Error al crear la cuenta. Es posible que el correo ya exista.");
    } finally {
      if (!mensaje) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-red-900 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-4 text-red-500">
          <ShieldAlert size={40} />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Inicializacion del Sistema</h1>
          <p className="text-gray-400 text-sm">Crear cuenta Super Administrador (MASTER_PAYSUR)</p>
        </div>

        {mensaje && (
          <div className="mb-6 p-4 rounded-xl bg-gray-900 border border-[#FF5E14] text-[#FF5E14] text-sm flex items-center gap-3">
            <CheckCircle2 size={18} />
            <span>{mensaje}</span>
          </div>
        )}

        <form onSubmit={handleCreateMaster} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Correo de Administrador</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Contraseña Segura</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-colors mt-4 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Crear Usuario MASTER"}
          </button>
        </form>
      </div>
    </div>
  );
}
