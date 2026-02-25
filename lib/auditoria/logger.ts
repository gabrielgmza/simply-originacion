import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function registrarEvento(datos: { 
  usuarioId: string, 
  evento: string, 
  detalles: string,
  entidadId: string 
}) {
  await addDoc(collection(db, "auditoria"), {
    ...datos,
    fecha: serverTimestamp()
  });
}
