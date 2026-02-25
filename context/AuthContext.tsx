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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  entidadData: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UsuarioApp | null>(null);
  const [entidadData, setEntidadData] = useState<Entidad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userRef = doc(db, "usuarios", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const dataUsuario = userSnap.data() as UsuarioApp;
            setUserData(dataUsuario);

            if (dataUsuario.entidadId) {
              const entidadRef = doc(db, "entidades", dataUsuario.entidadId);
              const entidadSnap = await getDoc(entidadRef);
              if (entidadSnap.exists()) {
                setEntidadData({ id: entidadSnap.id, ...entidadSnap.data() } as Entidad);
              }
            }
          }
        } catch (error) {
          console.error("Error al obtener datos:", error);
        }
      } else {
        setUserData(null);
        setEntidadData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, entidadData, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
