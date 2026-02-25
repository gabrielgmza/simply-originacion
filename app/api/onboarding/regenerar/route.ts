import { NextResponse } from "next/server";
import { doc, updateDoc, collection, query, where, getDocs, serverTimestamp, addDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { operacionId, entidadId, usuarioEmail } = await request.json();
    if (!operacionId || !entidadId) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const q = query(collection(db, "magic_links"), where("operacionId", "==", operacionId), where("usado", "==", false));
    const snap = await getDocs(q);
    
    await Promise.all(snap.docs.map(linkDoc => 
      updateDoc(doc(db, "magic_links", linkDoc.id), { 
        usado: true, 
        notas: "Invalidado por re-generación",
        fechaInvalidacion: serverTimestamp()
      })
    ));

    const nuevoToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 24);

    await setDoc(doc(db, "magic_links", nuevoToken), {
      token: nuevoToken, operacionId, entidadId, usado: false,
      expiracion, fechaCreacion: serverTimestamp(), generadoPor: usuarioEmail
    });

    await addDoc(collection(db, "logs_operaciones"), {
      operacionId, entidadId, usuario: usuarioEmail,
      accion: "REGENERACION_LINK", detalles: "Link rotado y anteriores anulados.",
      fecha: serverTimestamp()
    });

    return NextResponse.json({ success: true, token: nuevoToken });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
