import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const PUNITORIO_DIARIO = 0.0012;

function generarPlanCuotas(op: any, pagos: any[]) {
  const { valorCuota, cuotas } = op.financiero || {};
  if (!valorCuota || !cuotas) return [];

  const fechaLiquidacion = op.fechaLiquidacion?.toDate?.() || new Date();
  const totalPagado = pagos
    .filter((p: any) => p.tipo !== "DEVOLUCION")
    .reduce((acc: number, p: any) => acc + p.monto, 0);

  let saldoDisponible = totalPagado;
  const hoy = new Date();

  return Array.from({ length: cuotas }, (_, i) => {
    const vencimiento = new Date(fechaLiquidacion);
    vencimiento.setMonth(vencimiento.getMonth() + i + 1);

    let estado = "PENDIENTE";
    if (saldoDisponible >= valorCuota) {
      estado = "PAGADA";
      saldoDisponible -= valorCuota;
    } else if (vencimiento < hoy) {
      estado = "VENCIDA";
    }

    return {
      numero: i + 1,
      vencimiento: vencimiento.toLocaleDateString("es-AR"),
      monto: valorCuota,
      estado,
    };
  });
}

export async function POST(request: Request) {
  try {
    const { operacionId, entidadId } = await request.json();

    const [opSnap, entSnap] = await Promise.all([
      getDoc(doc(db, "operaciones", operacionId)),
      getDoc(doc(db, "entidades", entidadId)),
    ]);

    if (!opSnap.exists()) {
      return NextResponse.json({ error: "Operacion no encontrada" }, { status: 404 });
    }

    const op = { id: opSnap.id, ...opSnap.data() } as any;
    const ent = (entSnap.data() || {}) as any;

    const pagosSnap = await getDocs(
      query(collection(db, "pagos"),
        where("operacionId", "==", operacionId),
        orderBy("fecha", "asc"))
    );
    const pagos = pagosSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    const plan = generarPlanCuotas(op, pagos);
    const valorCuota    = op.financiero?.valorCuota || 0;
    const totalCuotas   = op.financiero?.cuotas || 0;
    const totalContrato = valorCuota * totalCuotas;
    const totalPagado   = pagos
      .filter((p: any) => p.tipo !== "DEVOLUCION")
      .reduce((acc: number, p: any) => acc + p.monto, 0);
    const saldoPendiente = Math.max(0, totalContrato - totalPagado);
    const diasMora       = op.cobranzas?.diasMora || 0;
    const punitorio      = Math.round((op.financiero?.montoSolicitado || 0) * PUNITORIO_DIARIO * diasMora);
    const porcentaje     = totalContrato > 0 ? Math.min(100, Math.round((totalPagado / totalContrato) * 100)) : 0;

    const datos = {
      entidad: {
        nombre: ent.nombreFantasia || ent.razonSocial || "Entidad",
        cuit:   ent.cuit || "",
        color:  ent.configuracion?.colorPrimario || "#FF5E14",
      },
      cliente: {
        nombre: op.cliente?.nombre || "",
        dni:    op.cliente?.dni || "",
        cuil:   op.cliente?.cuil || "",
      },
      financiero: {
        montoSolicitado: op.financiero?.montoSolicitado || 0,
        valorCuota,
        totalCuotas,
        tna:             op.financiero?.tna || 0,
        totalContrato,
        totalPagado,
        saldoPendiente,
        punitorio,
        porcentaje,
        diasMora,
      },
      fechaEmision: new Date().toLocaleDateString("es-AR"),
      operacionId:  operacionId.slice(0, 8).toUpperCase(),
      plan,
      pagos: pagos.map((p: any) => ({
        monto:       p.monto,
        tipo:        p.tipo,
        fecha:       p.fecha?.toDate?.()?.toLocaleDateString("es-AR") || "—",
        observacion: p.observacion || "",
      })),
    };

    const tmpJson    = join(tmpdir(), "ec_" + operacionId + ".json");
    const tmpPdf     = join(tmpdir(), "ec_" + operacionId + ".pdf");
    const scriptPath = join(process.cwd(), "scripts", "generar_estado_cuenta.py");

    writeFileSync(tmpJson, JSON.stringify(datos));
    execSync('python3 "' + scriptPath + '" "' + tmpJson + '" "' + tmpPdf + '"', { timeout: 20000 });

    const pdfBuffer = readFileSync(tmpPdf);
    try { unlinkSync(tmpJson); unlinkSync(tmpPdf); } catch {}

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="estado-cuenta-' + operacionId.slice(0, 6) + '.pdf"',
      },
    });

  } catch (error: any) {
    console.error("[Estado cuenta PDF]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
