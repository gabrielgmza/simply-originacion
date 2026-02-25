import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, addDoc, doc, serverTimestamp } from "firebase/firestore";

export const generarNuevoLinkFirma = async (operacionId: string, clienteId: string) => {
  // 1. Buscar y anular links anteriores inmediatamente
  const q = query(
    collection(db, "magic_links"), 
    where("operacionId", "==", operacionId),
    where("estado", "==", "ACTIVO")
  );
  
  const snap = await getDocs(q);
  const promesasAnulacion = snap.docs.map(d => 
    updateDoc(doc(db, "magic_links", d.id), { 
      estado: "ANULADO",
      motivoAnulacion: "REGENERACION_SOLICITADA",
      fechaAnulacion: serverTimestamp() 
    })
  );
  await Promise.all(promesasAnulacion);

  // 2. Crear el nuevo Link con expiración (24hs)
  const nuevoLink = await addDoc(collection(db, "magic_links"), {
    operacionId,
    clienteId,
    token: Math.random().toString(36).substring(2, 15),
    estado: "ACTIVO",
    fechaCreacion: serverTimestamp(),
    expira: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });

  return nuevoLink.id;
};
