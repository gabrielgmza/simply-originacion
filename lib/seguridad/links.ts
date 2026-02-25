import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, addDoc, doc, serverTimestamp } from "firebase/firestore";

export const manejarMagicLink = async (operacionId: string, clienteId: string) => {
  // 1. Buscar links activos previos y anularlos ipso facto
  const q = query(
    collection(db, "magic_links"), 
    where("operacionId", "==", operacionId),
    where("estado", "==", "ACTIVO")
  );
  
  const snap = await getDocs(q);
  const anulaciones = snap.docs.map(d => 
    updateDoc(doc(db, "magic_links", d.id), { 
      estado: "ANULADO",
      motivo: "REGENERACION_DE_LINK",
      fechaAnulacion: serverTimestamp() 
    })
  );
  await Promise.all(anulaciones);

  // 2. Crear el nuevo token único
  const nuevoToken = Math.random().toString(36).substring(2, 15);
  await addDoc(collection(db, "magic_links"), {
    operacionId,
    clienteId,
    token: nuevoToken,
    estado: "ACTIVO",
    fechaCreacion: serverTimestamp(),
    expira: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24hs de validez
  });

  return nuevoToken;
};
