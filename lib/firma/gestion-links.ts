import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

export const anularLinksAnteriores = async (operacionId: string) => {
  // Buscamos todos los links generados para esta operación que estén 'ACTIVOS'
  const q = query(collection(db, "links_firma"), 
            where("operacionId", "==", operacionId), 
            where("estado", "==", "ACTIVO"));
  
  const snap = await getDocs(q);
  
  // Los marcamos como 'ANULADOS' para que el Magic Link deje de funcionar
  const promesas = snap.docs.map(linkDoc => 
    updateDoc(doc(db, "links_firma", linkDoc.id), {
      estado: "ANULADO",
      fechaAnulacion: new Date().toISOString(),
      motivo: "Generación de nuevo link o cambio en política de riesgo"
    })
  );

  await Promise.all(promesas);
  return { success: true, anulados: snap.size };
};
