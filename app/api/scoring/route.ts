import { NextResponse } from 'next/server';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function POST(req: Request) {
  const { dni, entidadId } = await req.json();
  
  // 1. Buscamos en nuestra DB de Situaciones (BCRA + Judicial Mendoza)
  const q = query(collection(db, "scoring_cache"), where("dni", "==", dni));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    // Si no está en cache, aquí dispararíamos el scraper real
    return NextResponse.json({ status: 'CONSULTANDO', data: null });
  }

  const data = querySnapshot.docs[0].data();
  return NextResponse.json({ status: 'COMPLETO', data });
}
