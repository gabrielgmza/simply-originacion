// app/api/renovaciones/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, addDoc, updateDoc,
  collection, serverTimestamp, query, where, getDocs
} from "firebase/firestore";

// ── GET: verificar elegibilidad de renovación ─────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const operacionId = searchParams.get("operacionId");
    const entidadId   = searchParams.get("entidadId");
    if (!operacionId || !entidadId)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    const opSnap = await getDoc(doc(db, "operaciones", operacionId));
    if (!opSnap.exists()) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    const op = opSnap.data() as any;

    // Calcular cuotas pagadas y saldo pendiente
    const pagosSnap = await getDocs(
      query(collection(db, "pagos"),
        where("operacionId", "==", operacionId),
        where("estado",      "==", "APROBADO"))
    );
    const cuotasPagadas  = pagosSnap.docs.length;
    const totalCuotas    = op.financiero?.cuotas       || 0;
    const valorCuota     = op.financiero?.valorCuota   || 0;
    const cuotasPendientes = Math.max(0, totalCuotas - cuotasPagadas);
    const saldoPendiente   = Math.round(cuotasPendientes * valorCuota);

    // Elegibilidad: LIQUIDADO con ≥ 3 cuotas pagadas, o FINALIZADO
    const elegible =
      op.estado === "FINALIZADO" ||
      (op.estado === "LIQUIDADO" && cuotasPagadas >= 3);

    return NextResponse.json({
      success: true,
      elegible,
      motivoInelegible: !elegible
        ? op.estado === "LIQUIDADO"
          ? `Debe tener al menos 3 cuotas pagadas (lleva ${cuotasPagadas})`
          : `Estado actual: ${op.estado}`
        : null,
      resumen: {
        estado:            op.estado,
        cuotasPagadas,
        cuotasPendientes,
        totalCuotas,
        saldoPendiente,
        fondeadorActual:   op.fondeo?.nombre || "Capital Propio",
        fondeadorId:       op.fondeo?.fondeadorId || null,
        cbuPago:           op.fondeo?.cbuPago || null,
        cliente:           op.cliente,
        monto:             op.financiero?.montoSolicitado,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST: crear renovación ────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const {
      operacionOrigenId,
      entidadId,
      usuarioEmail,
      nuevoMonto,
      nuevasCuotas,
      nuevoFondeo,       // oferta del nuevo fondeador (del motor de subasta)
      saldoPendiente,    // calculado en el GET
    } = await request.json();

    if (!operacionOrigenId || !entidadId || !nuevoMonto)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    const opOrigenSnap = await getDoc(doc(db, "operaciones", operacionOrigenId));
    if (!opOrigenSnap.exists()) return NextResponse.json({ error: "Operación origen no encontrada" }, { status: 404 });
    const opOrigen = opOrigenSnap.data() as any;

    // Crear nueva operación con referencia a la anterior
    const nuevaOp = {
      entidadId,
      vendedorId:  usuarioEmail,
      sucursalId:  opOrigen.sucursalId || null,
      tipo:        opOrigen.tipo || "PRIVADO",
      estado:      "EN_REVISION",
      esRenovacion: true,
      operacionOrigenId,
      cliente:     opOrigen.cliente,
      financiero: {
        montoSolicitado: nuevoMonto,
        cuotas:          nuevasCuotas,
        valorCuota:      nuevoFondeo?.cuotaFinal || 0,
        tna:             nuevoFondeo?.tna        || 0,
        cft:             nuevoFondeo?.cft        || 0,
        totalDevolver:   nuevoFondeo?.totalDevolver || 0,
        saldoCancelado:  saldoPendiente || 0,
      },
      fondeo: nuevoFondeo ? {
        fondeadorId: nuevoFondeo.fondeadorId,
        nombre:      nuevoFondeo.nombre,
        tna:         nuevoFondeo.tna,
        cuotaFinal:  nuevoFondeo.cuotaFinal,
        comision:    nuevoFondeo.comision,
      } : null,
      legajo:   opOrigen.legajo   || {},
      scoring:  opOrigen.scoring  || {},
      fechaCreacion:      serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    };

    const nuevaOpRef = await addDoc(collection(db, "operaciones"), nuevaOp);

    // Marcar operación origen como RENOVADA (no FINALIZADA — la carta lo hace)
    await updateDoc(doc(db, "operaciones", operacionOrigenId), {
      estado:                   "EN_RENOVACION",
      renovadaConOperacionId:   nuevaOpRef.id,
      fechaActualizacion:       serverTimestamp(),
    });

    // Auditoría
    await addDoc(collection(db, "auditoria"), {
      operacionId:  nuevaOpRef.id,
      entidadId,
      accion:       "RENOVACION_CREADA",
      detalles:     `Origen: ${operacionOrigenId} — Nuevo monto: $${nuevoMonto} — Saldo cancelado: $${saldoPendiente}`,
      usuarioEmail: usuarioEmail || "sistema",
      fecha:        serverTimestamp(),
    });

    return NextResponse.json({
      success:        true,
      nuevaOperacionId: nuevaOpRef.id,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
