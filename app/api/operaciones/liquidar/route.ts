// app/api/operaciones/liquidar/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { dispararEmail } from "@/lib/email/motor";

export async function POST(request: Request) {
  try {
    const { operacionId } = await request.json();
    if (!operacionId) return NextResponse.json({ error: "ID faltante" }, { status: 400 });

    const opRef  = doc(db, "operaciones", operacionId);
    const opSnap = await getDoc(opRef);
    if (!opSnap.exists()) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    const op = opSnap.data() as any;

    await updateDoc(opRef, {
      estado: "LIQUIDADO",
      fechaLiquidacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    });

    // Email automatico al cliente (no bloquea la respuesta)
    if (op.cliente?.email) {
      dispararEmail(op.entidadId, "CREDITO_LIQUIDADO", op.cliente.email, {
        nombre:      op.cliente.nombre,
        monto:       op.financiero?.montoSolicitado || 0,
        cbu:         op.cliente.cbu || "",
        operacionId,
      }).catch(e => console.error("[Email liquidar]", e));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Fallo en proceso de liquidacion" }, { status: 500 });
  }
}
