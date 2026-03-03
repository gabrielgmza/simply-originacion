// app/api/leads/route.ts
// POST: guarda el lead y notifica al vendedor por WhatsApp
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, getDocs, query, where, orderBy, limit } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const { entidadId, nombre, telefono, email, dni, sexo, cuil,
            monto, cuotas, cuotaEstimada, bcra, scoring } = await request.json();

    if (!entidadId || !dni || !nombre || !telefono)
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });

    // Guardar lead en Firestore
    const leadRef = await addDoc(collection(db, "leads"), {
      entidadId, nombre, telefono, email: email || null,
      dni, sexo, cuil,
      simulacion: { monto, cuotas, cuotaEstimada },
      bcra: {
        situacion:   bcra?.peorSituacion || 1,
        tieneDeudas: bcra?.tieneDeudas   || false,
        nombre:      bcra?.nombre        || nombre,
      },
      scoring: {
        resultado: scoring?.resultado || "APROBADO",
        puntaje:   scoring?.puntaje   || 500,
      },
      estado:  "NUEVO",
      origen:  "SIMULADOR_PUBLICO",
      fechaCreacion:     serverTimestamp(),
      fechaActualizacion:serverTimestamp(),
    });

    // Notificar al primer vendedor disponible de la entidad por WhatsApp
    try {
      const vendSnap = await getDocs(
        query(collection(db, "usuarios"),
          where("entidadId", "==", entidadId),
          where("rol",       "in", ["VENDEDOR", "GERENTE_GENERAL"]),
          where("activo",    "==", true),
          orderBy("fechaCreacion"),
          limit(1))
      );
      if (!vendSnap.empty) {
        const vend = vendSnap.docs[0].data() as any;
        if (vend.telefono) {
          await fetch("/api/whatsapp/enviar", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entidadId,
              telefono: vend.telefono,
              mensaje:  `🔔 *Nuevo lead*\n\n` +
                        `*Nombre:* ${nombre}\n` +
                        `*DNI:* ${dni}\n` +
                        `*Tel:* ${telefono}\n` +
                        `*Simul\u00f3:* $${monto?.toLocaleString("es-AR")} en ${cuotas} cuotas\n` +
                        `*Cuota est.:* $${cuotaEstimada?.toLocaleString("es-AR")}\n` +
                        `*BCRA:* Situaci\u00f3n ${bcra?.peorSituacion || 1}\n` +
                        `*Pre-aprobaci\u00f3n:* ${scoring?.resultado || "APROBADO"}`,
            }),
          });
        }
      }
    } catch (e) { console.error("[Lead WS]", e); }

    return NextResponse.json({ success: true, leadId: leadRef.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
