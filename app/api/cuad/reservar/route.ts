import { NextResponse } from "next/server";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs, limit } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

const BOT_URL = process.env.BOT_URL || "https://simply-bot-mendoza.run.app";

export async function POST(request: Request) {
  let credencialUsadaId: string | null = null;
  try {
    const { operacionId, entidadId, dni, montoCuota } = await request.json();
    if (!operacionId || !entidadId || !dni || !montoCuota)
      return NextResponse.json({ error: "Faltan parametros" }, { status: 400 });

    const q = query(collection(db, "credencialesCuad"),
      where("entidadId", "==", entidadId), where("activa", "==", true),
      where("enUsoPorBot", "==", false), limit(1));
    const snap = await getDocs(q);
    if (snap.empty)
      return NextResponse.json({ error: "Todas las cuentas de gobierno estan ocupadas. Reintenta en unos segundos." }, { status: 429 });

    const credencialDoc = snap.docs[0];
    credencialUsadaId = credencialDoc.id;
    const cred = credencialDoc.data();
    await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: true });

    const botRes = await fetch(`${BOT_URL}/api/ejecutar-alta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni, montoCuota, usuario: cred.usuarioGobierno, password: cred.passwordGobierno }),
      signal: AbortSignal.timeout(120000),
    });
    const botData = await botRes.json();
    await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: false });
    credencialUsadaId = null;

    if (!botData.success)
      return NextResponse.json({ error: botData.error || "El bot no pudo ejecutar el Alta." }, { status: 422 });

    let screenshotUrl = "";
    if (botData.screenshotB64) {
      const sr = ref(storage, `cuad/${entidadId}/${operacionId}_alta_${Date.now()}.png`);
      await uploadString(sr, `data:image/png;base64,${botData.screenshotB64}`, "data_url");
      screenshotUrl = await getDownloadURL(sr);
    }

    await updateDoc(doc(db, "operaciones", operacionId), {
      "cuad.estado": "ALTA_EJECUTADA", "cuad.codigoCAD": botData.codigoCAD || "",
      "cuad.montoCuota": montoCuota, "cuad.screenshotUrl": screenshotUrl,
      "cuad.fechaAlta": serverTimestamp(), "legajo.cadUrl": screenshotUrl,
      estado: "APROBADO", fechaActualizacion: serverTimestamp(),
    });

    await addDoc(collection(db, "logs_operaciones"), {
      operacionId, entidadId, usuario: "SISTEMA_CUAD", accion: "CUAD_ALTA_EJECUTADA",
      detalles: `Codigo CAD: ${botData.codigoCAD || "sin codigo"} | Cuota: $${montoCuota}`,
      fecha: serverTimestamp(),
    });

    return NextResponse.json({ success: true, codigoCAD: botData.codigoCAD, screenshotUrl, montoCuota });

  } catch (error: any) {
    if (credencialUsadaId)
      await updateDoc(doc(db, "credencialesCuad", credencialUsadaId), { enUsoPorBot: false }).catch(() => {});
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
