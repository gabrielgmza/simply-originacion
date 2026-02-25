import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";

export const solicitarOTP = async (operacionId: string, destino: string) => {
  // 1. Limpiar códigos viejos para este destino
  const q = query(collection(db, "codigos_otp"), where("destino", "==", destino));
  const snap = await getDocs(q);
  snap.forEach(async (doc) => await deleteDoc(doc.ref));

  // 2. Generar código de 6 dígitos
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Guardar en base con expiración de 10 minutos
  await addDoc(collection(db, "codigos_otp"), {
    operacionId,
    destino,
    codigo,
    expira: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    creado: serverTimestamp()
  });

  // Aquí se dispara el envío real vía Twilio o SendGrid
  console.log(`[SEGURIDAD] Código ${codigo} enviado a ${destino}`);
  return true;
};
