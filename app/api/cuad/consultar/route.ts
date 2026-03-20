import { NextResponse } from "next/server";
import { collection, query, where, getDocs, doc, updateDoc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getSession } from "@/lib/auth/session";
import { validarAccesoEntidad } from "@/lib/auth/validate-entidad";

const BOT_URL = process.env.BOT_URL || "https://simply-bot-mendoza-278599265960.us-central1.run.app";

function esPeriodoCierreGobierno(): boolean {
  const dia = new Date().getDate();
  return dia >= 16 && dia <= 25;
}

export async function POST(request: Request) {
  let credencialUsadaId: string | null = null;

  try {
    const { dni, entidadId, sexo } = await request.json();
    if (!dni || !entidadId) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    // Validar que el usuario pertenece a esta entidad
    const session = getSession(request as any);
    const acceso = validarAccesoEntidad(session, entidadId);
    if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: 403 });

    const q = query(
      collection(db, "credencialesCuad"),
      where("entidadId", "==", entidadId),
      where("activa", "==", true),
      where("enUsoPorBot", "==", false),
      limit(1)
    );
    const credencialesSnap = await getDocs(q);
    if (credencialesSnap.empty) {
      return NextResponse.json({ error: "Todas las cuentas de gobierno están ocupadas o no hay credenciales configuradas." }, { status: 429 });
    }

    const credencialDoc = credencialesSnap.docs[0];
    credencialUsadaId = credencialDoc.id;
    const credencialData = credencialDoc.data();
    await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: true });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240000);

    let botResponse;
    try {
      const res = await fetch(`${BOT_URL}/api/simular-cupo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni, usuario: credencialData.usuarioGobierno, password: credencialData.passwordGobierno }),
        signal: controller.signal,
      });
      botResponse = await res.json();
    } catch (fetchError: any) {
      botResponse = { success: false, error: true, mensaje: fetchError.name === "AbortError"
        ? "Timeout — el sistema de gobierno no respondió a tiempo"
        : `Error de conexión con el bot: ${fetchError.message}` };
    } finally { clearTimeout(timeout); }

    await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: false });

    const warning = esPeriodoCierreGobierno()
      ? "⚠️ Estamos en período de cierre mensual del sistema de gobierno (~16 al ~25). Los resultados pueden ser inexactos."
      : undefined;

    if (botResponse.error) {
      const msg = botResponse.mensaje || "Error desconocido";
      const esGobiernoCaido = /timeout|net::ERR|Navigation timeout|Screen check|Modo=M no apareció/i.test(msg);
      return NextResponse.json({
        success: false, error: true,
        mensaje: esGobiernoCaido ? "El sistema de gobierno no está disponible en este momento." : msg,
        gobiernoNoDisponible: esGobiernoCaido, warning,
      });
    }

    if (botResponse.noRegistra) {
      return NextResponse.json({ success: true, dni, cupoDisponible: 0, estado: "NO_REGISTRA", noRegistra: true, warning });
    }

    return NextResponse.json({
      success: true, dni,
      cupoDisponible: botResponse.cupoMaximo || 0,
      estado: botResponse.cupoMaximo > 0 ? "APTO" : "SIN_CUPO",
      nombre: botResponse.nombre || "",
      iteraciones: botResponse.iteraciones || 0,
      warning,
    });

  } catch (error: any) {
    if (credencialUsadaId) {
      await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: false }).catch(console.error);
    }
    return NextResponse.json({ success: false, error: true, mensaje: "Error interno." }, { status: 500 });
  }
}
