import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const { entidadId, vendedorId, dni, cupoMaximo, propuesta, nombreEmpleado } = await request.json();
    if (!entidadId || !vendedorId || !dni || !propuesta)
      return NextResponse.json({ error: "Faltan parametros" }, { status: 400 });

    const opRef = await addDoc(collection(db, "operaciones"), {
      entidadId,
      vendedorId,
      tipo:   "CUAD",
      estado: "PENDIENTE_ALTA",
      cliente: {
        dni,
        nombre: nombreEmpleado || "",
        cuil:   "",
      },
      financiero: {
        montoSolicitado: propuesta.monto,
        cuotas:          propuesta.cuotas,
        cuotaMensual:    propuesta.cuotaMensual,
        tna:             propuesta.tna,
        cft:             0,
        fechaVencimiento:null,
      },
      cuad: {
        cupoMaximo,
        fondeadorId:     propuesta.fondeadorId,
        fondeadorNombre: propuesta.fondeadorNombre,
        estado:          "PENDIENTE_ALTA",
      },
      legajo:    {},
      seguridad: {},
      fechaCreacion:     serverTimestamp(),
      fechaActualizacion:serverTimestamp(),
    });

    return NextResponse.json({ success: true, operacionId: opRef.id });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
