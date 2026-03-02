import { NextResponse } from "next/server";
import { enviarWhatsApp } from "@/lib/notificaciones/whatsapp";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// ─── POST /api/whatsapp/enviar ────────────────────────────────────────────────
// Punto de entrada unificado. Recibe evento + operacionId y arma los datos.
export async function POST(request: Request) {
  try {
    const { operacionId, evento, entidadId } = await request.json();

    if (!operacionId || !evento || !entidadId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // Cargar operación para obtener datos del cliente
    const opSnap = await getDoc(doc(db, "operaciones", operacionId));
    if (!opSnap.exists()) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });
    const op = opSnap.data();

    const telefono = op.cliente?.telefono?.replace(/\D/g, "");
    if (!telefono) return NextResponse.json({ error: "El cliente no tiene teléfono registrado" }, { status: 400 });

    // Armar datos según evento
    const datos: Record<string, any> = {
      nombreCliente: op.cliente?.nombre || "Cliente",
      monto: op.financiero?.montoSolicitado,
      valorCuota: op.financiero?.valorCuota,
      cbuUltimos4: op.onboarding?.cbu?.slice(-4) || "XXXX",
    };

    // Si es link de onboarding, buscar el token activo
    if (evento === "LINK_ONBOARDING") {
      const { getDocs, collection, query, where, limit } = await import("firebase/firestore");
      const linkSnap = await getDocs(
        query(collection(db, "magic_links"),
          where("operacionId", "==", operacionId),
          where("usado", "==", false),
          limit(1))
      );
      if (!linkSnap.empty) {
        const token = linkSnap.docs[0].data().token;
        datos.link = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/${token}`;
      } else {
        return NextResponse.json({ error: "No hay link activo para esta operación" }, { status: 400 });
      }
    }

    if (evento === "PROMESA_CONFIRMADA") {
      datos.fechaPromesa = op.cobranzas?.ultimaPromesa || "próximamente";
    }

    const result = await enviarWhatsApp({ entidadId, telefono, evento, datos, operacionId });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API WhatsApp]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
