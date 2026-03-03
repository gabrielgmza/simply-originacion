// app/api/portal/consulta/route.ts
// Ruta PÚBLICA — no requiere auth. Solo expone datos seguros del cliente.
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, query, where, getDocs,
  doc, getDoc, orderBy
} from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const { entidadId, dni } = await request.json();
    if (!entidadId || !dni)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    // ── 1. Verificar que la entidad tiene el portal activo ───────────────────
    const entSnap = await getDoc(doc(db, "entidades", entidadId));
    if (!entSnap.exists())
      return NextResponse.json({ error: "Entidad no encontrada" }, { status: 404 });

    const ent = entSnap.data() as any;
    const portalConfig = ent?.configuracion?.portal || {};

    if (!portalConfig.activo)
      return NextResponse.json({ error: "Portal no disponible" }, { status: 403 });

    // ── 2. Buscar operaciones del DNI ────────────────────────────────────────
    const opsSnap = await getDocs(
      query(
        collection(db, "operaciones"),
        where("entidadId", "==", entidadId),
        where("cliente.dni", "==", dni.replace(/\D/g, ""))
      )
    );

    if (opsSnap.empty)
      return NextResponse.json({ error: "No se encontraron operaciones para ese DNI" }, { status: 404 });

    // ── 3. Para cada operación, cargar pagos ─────────────────────────────────
    const operaciones = await Promise.all(
      opsSnap.docs.map(async (d) => {
        const op = d.data() as any;

        // Pagos de esta operación
        const pagosSnap = await getDocs(
          query(
            collection(db, "pagos"),
            where("operacionId", "==", d.id),
            orderBy("fecha", "desc")
          )
        );
        const pagos = pagosSnap.docs.map(p => ({
          fecha:  p.data().fecha?.toDate?.()?.toISOString() || null,
          monto:  p.data().monto,
          metodo: p.data().metodo || "—",
        }));

        const totalPagado = pagos.reduce((a, p) => a + p.monto, 0);

        // Datos del vendedor (teléfono para WhatsApp)
        let vendedorTel = ent?.contacto?.telefono || "";
        if (portalConfig.mostrarContactoAsesor && op.vendedorId) {
          const vSnap = await getDoc(doc(db, "usuarios", op.vendedorId));
          if (vSnap.exists()) vendedorTel = vSnap.data()?.telefono || vendedorTel;
        }

        // ── Devolver solo campos seguros (NO legajo, NO seguridad) ──────────
        return {
          id:     d.id,
          estado: op.estado,
          tipo:   op.tipo,
          cliente: {
            nombre: op.cliente?.nombre,
            dni:    op.cliente?.dni,
          },
          financiero: {
            montoSolicitado: op.financiero?.montoSolicitado,
            cuotas:          op.financiero?.cuotas,
            valorCuota:      op.financiero?.valorCuota,
            tna:             op.financiero?.tna,
            totalContrato:   op.financiero?.totalContrato,
          },
          fechaLiquidacion: op.fechaLiquidacion?.toDate?.()?.toISOString() || null,
          fechaCreacion:    op.fechaCreacion?.toDate?.()?.toISOString()    || null,
          cobranzas: {
            diasMora:           op.cobranzas?.diasMora || 0,
            punitorioAcumulado: op.cobranzas?.punitorioAcumulado || 0,
          },
          pagos,
          totalPagado,
          vendedorTel: portalConfig.mostrarContactoAsesor ? vendedorTel : null,
        };
      })
    );

    // ── 4. Config del portal (solo lo visual/público) ────────────────────────
    const portalPublico = {
      nombreFantasia: ent.nombreFantasia,
      logoUrl:        ent.configuracion?.logoUrl        || null,
      colorPrimario:  ent.configuracion?.colorPrimario  || "#FF5E14",
      // Features habilitadas
      mostrarPlanCuotas:      portalConfig.mostrarPlanCuotas      ?? true,
      mostrarHistorialPagos:  portalConfig.mostrarHistorialPagos  ?? true,
      mostrarCertificados:    portalConfig.mostrarCertificados     ?? true,
      mostrarContactoAsesor:  portalConfig.mostrarContactoAsesor  ?? true,
      mensajeBienvenida:      portalConfig.mensajeBienvenida       || null,
    };

    return NextResponse.json({ success: true, operaciones, portal: portalPublico });

  } catch (error: any) {
    console.error("[Portal consulta]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
