import { NextResponse } from "next/server";
import { collection, query, where, getDocs, doc, updateDoc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

const BOT_URL = process.env.BOT_URL || "https://simply-bot-mendoza-278599265960.us-central1.run.app";

// Período de cierre mensual del gobierno (~16 al ~25)
function esPeriodoCierreGobierno(): boolean {
  const dia = new Date().getDate();
  return dia >= 16 && dia <= 25;
}

export async function POST(request: Request) {
  let credencialUsadaId: string | null = null;

  try {
    const { dni, entidadId, sexo } = await request.json();

    if (!dni || !entidadId) {
      return NextResponse.json({ error: "Faltan parámetros (DNI o Entidad)" }, { status: 400 });
    }

    // 1. Buscar credencial de gobierno LIBRE
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
        error: "Todas las cuentas de gobierno están ocupadas o no hay credenciales configuradas. Intentá en unos segundos."
      }, { status: 429 });
    }

    // 2. Bloquear credencial
    const credencialDoc = credencialesSnap.docs[0];
    credencialUsadaId = credencialDoc.id;
    const credencialData = credencialDoc.data();

    await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), {
      enUsoPorBot: true
    });

    // 3. Llamar al bot REAL
    console.log(`[CUAD] DNI=${dni} usuario=${credencialData.usuarioGobierno} entidad=${entidadId}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240000); // 4 min timeout

    let botResponse;
    try {
      const res = await fetch(`${BOT_URL}/api/simular-cupo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni,
          usuario: credencialData.usuarioGobierno,
          password: credencialData.passwordGobierno,
        }),
        signal: controller.signal,
      });
      botResponse = await res.json();
    } catch (fetchError: any) {
      if (fetchError.name === "AbortError") {
        botResponse = { success: false, error: true, mensaje: "Timeout — el sistema de gobierno no respondió a tiempo" };
      } else {
        botResponse = { success: false, error: true, mensaje: `Error de conexión con el bot: ${fetchError.message}` };
      }
    } finally {
      clearTimeout(timeout);
    }

    // 4. Liberar credencial
    await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), {
      enUsoPorBot: false
    });

    // 5. Procesar respuesta
    const warning = esPeriodoCierreGobierno()
      ? "⚠️ Estamos en período de cierre mensual del sistema de gobierno (~16 al ~25). Los resultados pueden ser inexactos."
      : undefined;

    if (botResponse.error) {
      // Determinar si es gobierno caído o error del bot
      const mensaje = botResponse.mensaje || "Error desconocido";
      const esGobiernoCaido =
        mensaje.includes("Timeout") ||
        mensaje.includes("timeout") ||
        mensaje.includes("net::ERR") ||
        mensaje.includes("Navigation timeout") ||
        mensaje.includes("Screen check falló") ||
        mensaje.includes("Modo=M no apareció");

      return NextResponse.json({
        success: false,
        error: true,
        mensaje: esGobiernoCaido
          ? "El sistema de gobierno no está disponible en este momento. Intentá más tarde."
          : mensaje,
        gobiernoNoDisponible: esGobiernoCaido,
        warning,
      });
    }

    if (botResponse.noRegistra) {
      return NextResponse.json({
        success: true,
        dni,
        cupoDisponible: 0,
        estado: "NO_REGISTRA",
        noRegistra: true,
        detalles: "El DNI no registra como empleado público en el sistema de gobierno.",
        warning,
      });
    }

    return NextResponse.json({
      success: true,
      dni,
      cupoDisponible: botResponse.cupoMaximo || 0,
      estado: botResponse.cupoMaximo > 0 ? "APTO" : "SIN_CUPO",
      nombre: botResponse.nombre || "",
      iteraciones: botResponse.iteraciones || 0,
      detalles: "Consulta exitosa al sistema de gobierno.",
      warning,
    });

  } catch (error: any) {
    console.error("[CUAD] Error:", error);

    if (credencialUsadaId) {
      await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: false }).catch(console.error);
    }

    return NextResponse.json({ 
      success: false,
      error: true,
      mensaje: "Error interno del servidor. Intentá de nuevo." 
    }, { status: 500 });
  }
}
