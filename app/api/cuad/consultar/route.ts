import { NextResponse } from "next/server";
import { collection, query, where, getDocs, doc, updateDoc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  let credencialUsadaId = null;

  try {
    const payload = await request.json();
    const { dni, entidadId } = payload;

    if (!dni || !entidadId) {
      return NextResponse.json({ error: "Faltan parametros (DNI o Entidad)" }, { status: 400 });
    }

    // 1. Buscar una credencial de gobierno que este LIBRE
    const q = query(
      collection(db, "credencialesCuad"), 
      where("entidadId", "==", entidadId),
      where("activa", "==", true),
      where("enUsoPorBot", "==", false),
      limit(1)
    );
    
    const credencialesSnap = await getDocs(q);

    if (credencialesSnap.empty) {
      return NextResponse.json({ 
        error: "Todas las cuentas de gobierno estan ocupadas o no hay credenciales configuradas. Intenta en unos segundos." 
      }, { status: 429 });
    }

    // 2. Bloquear la credencial para este hilo de ejecucion
    const credencialDoc = credencialesSnap.docs[0];
    credencialUsadaId = credencialDoc.id;
    const credencialData = credencialDoc.data();

    await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), {
      enUsoPorBot: true
    });

    // 3. --- AQUI INICIA LA MAGIA DEL BOT (Simulacion RPA) ---
    // En produccion, aqui hariamos un fetch() a tu servidor externo de Puppeteer
    // pasandole credencialData.usuarioGobierno y credencialData.passwordGobierno
    
    console.log(`[BOT] Iniciando login en Mendoza con usuario: ${credencialData.usuarioGobierno}...`);
    await new Promise(resolve => setTimeout(resolve, 3500)); // Simulando resolucion de Captcha y Login
    
    console.log(`[BOT] Buscando bono de sueldo para DNI: ${dni}...`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulando lectura de haberes

    // Generamos un cupo simulado para la prueba
    const tieneCupo = Math.random() > 0.2; // 80% de probabilidad de tener cupo
    const cupoDisponible = tieneCupo ? Math.floor(Math.random() * (250000 - 30000 + 1) + 30000) : 0;
    
    // 4. --- FIN DEL BOT ---

    // 5. Liberar la credencial para que otro vendedor pueda usarla
    await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), {
      enUsoPorBot: false
    });

    return NextResponse.json({ 
      dni: dni,
      cupoDisponible: cupoDisponible,
      estado: tieneCupo ? "APTO" : "SIN_CUPO",
      detalles: "Lectura exitosa del bono de sueldo"
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error en orquestador CUAD:", error);
    
    // Si algo falla y el script explota, nos aseguramos de liberar la credencial
    if (credencialUsadaId) {
      await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: false }).catch(console.error);
    }

    return NextResponse.json({ error: "Error interno en el motor de Scraping" }, { status: 500 });
  }
}
