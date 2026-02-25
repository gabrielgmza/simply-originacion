import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";

export const generarOTP = async (operacionId: string, destino: string, tipo: 'EMAIL' | 'SMS') => {
  // 1. Limpiar OTPs anteriores para este destino
  const q = query(collection(db, "otps"), where("destino", "==", destino));
  const snap = await getDocs(q);
  snap.forEach(async (d) => await deleteDoc(d.ref));

  // 2. Generar código de 6 dígitos
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Guardar en base con expiración
  await addDoc(collection(db, "otps"), {
    operacionId,
    destino,
    tipo,
    codigo,
    expira: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    fechaCreacion: serverTimestamp()
  });

  // Aquí se dispararía el servicio de envío (Twilio/SendGrid)
  console.log(`[OTP] Enviando ${codigo} a ${destino}`);
  return true;
};

export const validarOTP = async (destino: string, codigoIngresado: string) => {
  const q = query(
    collection(db, "otps"), 
    where("destino", "==", destino), 
    where("codigo", "==", codigoIngresado)
  );
  const snap = await getDocs(q);
  
  if (snap.empty) return false;
  
  const data = snap.docs[0].data();
  if (new Date(data.expira) < new Date()) return false;

  return true;
};
