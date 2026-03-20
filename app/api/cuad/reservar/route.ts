import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, serverTimestamp, query, where, getDocs, limit, addDoc } from "firebase/firestore";
import { getSession } from "@/lib/auth/session";
import { validarAccesoEntidad } from "@/lib/auth/validate-entidad";

const BOT_URL = process.env.BOT_URL || "https://simply-bot-mendoza-278599265960.us-central1.run.app";

export async function POST(request: Request) {
  let credencialUsadaId: string | null = null;
  try {
    const { operacionId, entidadId, dni, montoCuota } = await request.json();
    if (!operacionId || !entidadId || !dni || !montoCuota)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    // Validar acceso
    const session = getSession(request as any);
    const acceso = validarAccesoEntidad(session, entidadId);
    if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: 403 });

    const q = query(collection(db, "credencialesCuad"),
      where("entidadId", "==", entidadId), where("activa", "==", true),
      where("enUsoPorBot", "==", false), limit(1));
    const snap = await getDocs(q);
    if (snap.empty)
      return NextResponse.json({ error: "Todas las cuentas de gobierno están ocupadas." }, { status: 429 });

    const credencialDoc = snap.docs[0];
    credencialUsadaId = credencialDoc.id;
    const cred = credencialDoc.data();
    await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: true });

    let botData;
    try {
      const botRes = await fetch(`${BOT_URL}/api/ejecutar-alta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni, montoCuota, usuario: cred.usuarioGobierno, password: cred.passwordGobierno }),
        signal: AbortSignal.timeout(180000),
      });
      botData = await botRes.json();
    } catch (fetchErr: any) {
      botData = { success: false, error: fetchErr.name === "AbortError"
        ? "Timeout — el sistema de gobierno no respondió a tiempo"
        : `Error de conexión: ${fetchErr.message}` };
    }

    await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: false });
    credencialUsadaId = null;

    if (!botData.success)
      return NextResponse.json({ error: botData.error || "El bot no pudo ejecutar el Alta." });

    if (operacionId) {
      await updateDoc(doc(db, "operaciones", operacionId), {
        "documentos.cad_codigo": botData.codigoCAD || "",
        "documentos.cad_screenshot": botData.screenshotUrl || "",
        estado: "APROBADO",
        fechaAlta: serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      codigoCAD: botData.codigoCAD,
      screenshotUrl: botData.screenshotUrl,
      operacionId,
    });

  } catch (error: any) {
    if (credencialUsadaId) {
      await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: false }).catch(console.error);
    }
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
