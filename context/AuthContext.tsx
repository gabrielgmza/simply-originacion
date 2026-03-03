"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UsuarioApp, Entidad } from "@/types";

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UsuarioApp | null;
  entidadData: Entidad | null;
  loading: boolean;
  // Impersonación
  impersonando: boolean;
  entidadImpersonada: string | null;
  salirImpersonacion: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  entidadData: null,
  loading: true,
  impersonando: false,
  entidadImpersonada: null,
  salirImpersonacion: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<FirebaseUser | null>(null);
  const [userData, setUserData]       = useState<UsuarioApp | null>(null);
  const [entidadData, setEntidadData] = useState<Entidad | null>(null);
  const [loading, setLoading]         = useState(true);
  const [impersonando, setImpersonando]               = useState(false);
  const [entidadImpersonada, setEntidadImpersonada]   = useState<string | null>(null);

  // ── Cargar entidad (propia o impersonada) ──
  const cargarEntidad = async (entidadId: string) => {
    const snap = await getDoc(doc(db, "entidades", entidadId));
    if (snap.exists()) {
      setEntidadData({ id: snap.id, ...snap.data() } as Entidad);
    }
  };

  // ── Salir de impersonación ──
  const salirImpersonacion = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("impersonando_entidadId");
      sessionStorage.removeItem("impersonando_nombreFantasia");
    }
    setImpersonando(false);
    setEntidadImpersonada(null);
    // Recargar entidad real del usuario
    if (userData?.entidadId) cargarEntidad(userData.entidadId);
  };

  // ── Auth listener ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userSnap = await getDoc(doc(db, "usuarios", currentUser.uid));
          if (userSnap.exists()) {
            const dataUsuario = userSnap.data() as UsuarioApp;
            setUserData(dataUsuario);

            // Verificar si hay impersonación activa en sessionStorage
            const impersonadoId = typeof window !== "undefined"
              ? sessionStorage.getItem("impersonando_entidadId")
              : null;

            if (impersonadoId && dataUsuario.rol === "MASTER_PAYSUR") {
              setImpersonando(true);
              setEntidadImpersonada(impersonadoId);
              await cargarEntidad(impersonadoId);
            } else if (dataUsuario.entidadId) {
              setImpersonando(false);
              setEntidadImpersonada(null);
              await cargarEntidad(dataUsuario.entidadId);
            }
          } else {
            console.warn("Usuario sin perfil. Cerrando sesión...");
            await auth.signOut();
            setUserData(null);
            setEntidadData(null);
          }
        } catch (error) {
          console.error("Error al obtener datos:", error);
          await auth.signOut();
        }
      } else {
        setUserData(null);
        setEntidadData(null);
        setImpersonando(false);
        setEntidadImpersonada(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Detectar cambios en sessionStorage (cuando admin navega al dashboard) ──
  useEffect(() => {
    if (!userData || userData.rol !== "MASTER_PAYSUR") return;
    const checkImpersonacion = () => {
      const id = sessionStorage.getItem("impersonando_entidadId");
      if (id && !impersonando) {
        setImpersonando(true);
        setEntidadImpersonada(id);
        cargarEntidad(id);
      }
    };
    checkImpersonacion();
  }, [userData]);

  return (
    <AuthContext.Provider value={{
      user, userData, entidadData, loading,
      impersonando, entidadImpersonada, salirImpersonacion
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
