import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import * as XLSX from "xlsx";

export async function POST(request: Request) {
  try {
    const { entidadId, desde, hasta, sucursalId, estado } = await request.json();
    if (!entidadId) return NextResponse.json({ error: "Falta entidadId" }, { status: 400 });

    // ── 1. Cargar datos base ──────────────────────────────────────────────────
    const [opsSnap, sucSnap, usersSnap] = await Promise.all([
      getDocs(query(collection(db, "operaciones"), where("entidadId", "==", entidadId))),
      getDocs(query(collection(db, "sucursales"),  where("entidadId", "==", entidadId))),
      getDocs(query(collection(db, "usuarios"),    where("entidadId", "==", entidadId))),
    ]);

    const sucursalesMap: Record<string, string> = {};
    sucSnap.docs.forEach(d => { sucursalesMap[d.id] = d.data().nombre; });

    const usuariosMap: Record<string, string> = {};
    usersSnap.docs.forEach(d => { usuariosMap[d.id] = d.data().nombre || d.data().email; });

    // ── 2. Filtrar operaciones ────────────────────────────────────────────────
    const desdeDate = desde ? new Date(desde) : null;
    const hastaDate = hasta ? new Date(hasta + "T23:59:59") : null;

    let ops = opsSnap.docs.map(d => {
      const data = d.data();
      const fecha = data.fechaCreacion?.toDate?.() || null;
      return { id: d.id, ...data, _fecha: fecha };
    });

    if (desdeDate) ops = ops.filter(o => o._fecha && o._fecha >= desdeDate);
    if (hastaDate) ops = ops.filter(o => o._fecha && o._fecha <= hastaDate);
    if (sucursalId && sucursalId !== "todas") ops = ops.filter(o => o.sucursalId === sucursalId);
    if (estado && estado !== "todos") ops = ops.filter(o => o.estado === estado);

    // ── 3. Helpers ────────────────────────────────────────────────────────────
    const fmt = (n: number) => Math.round(n);
    const fmtFecha = (d: Date | null) => d ? d.toLocaleDateString("es-AR") : "—";

    // ── 4. Construir workbook ─────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();

    // ── HOJA 1: RESUMEN EJECUTIVO ─────────────────────────────────────────────
    const sucursalesLista = sucSnap.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));
    const resumenRows: any[][] = [];

    resumenRows.push(["RESUMEN EJECUTIVO POR SUCURSAL"]);
    resumenRows.push([`Período: ${desde || "—"} al ${hasta || "—"}`]);
    resumenRows.push([]);
    resumenRows.push([
      "Sucursal", "Operaciones", "Monto Liquidado ($)", "En Mora",
      "% Mora", "Monto en Mora ($)", "Finalizado", "Pendiente"
    ]);

    for (const suc of [...sucursalesLista, { id: "sin_sucursal", nombre: "Sin sucursal" }]) {
      const opsSuc = ops.filter(o =>
        suc.id === "sin_sucursal" ? !o.sucursalId : o.sucursalId === suc.id
      );
      const liquidadas = opsSuc.filter(o => ["LIQUIDADO", "FINALIZADO"].includes(o.estado));
      const enMora     = opsSuc.filter(o => o.estado === "EN_MORA");
      const finalizado = opsSuc.filter(o => o.estado === "FINALIZADO");
      const pendiente  = opsSuc.filter(o => !["LIQUIDADO","FINALIZADO","RECHAZADO","EN_MORA"].includes(o.estado));

      const montoLiq  = liquidadas.reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
      const montoMora = enMora.reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
      const porcMora  = opsSuc.length > 0 ? ((enMora.length / opsSuc.length) * 100).toFixed(1) + "%" : "0%";

      resumenRows.push([
        suc.nombre, opsSuc.length, fmt(montoLiq),
        enMora.length, porcMora, fmt(montoMora),
        finalizado.length, pendiente.length
      ]);
    }

    // Totales
    const totalOps    = ops.length;
    const totalMonto  = ops.filter(o => ["LIQUIDADO","FINALIZADO"].includes(o.estado))
                           .reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
    const totalMora   = ops.filter(o => o.estado === "EN_MORA").length;
    resumenRows.push([]);
    resumenRows.push(["TOTALES", totalOps, fmt(totalMonto), totalMora, "", "", "", ""]);

    const ws1 = XLSX.utils.aoa_to_sheet(resumenRows);
    ws1["!cols"] = [30,15,22,12,10,20,14,14].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen Ejecutivo");

    // ── HOJA 2: DETALLE DE OPERACIONES ───────────────────────────────────────
    const detalleRows: any[][] = [];
    detalleRows.push([
      "Legajo", "Fecha", "Sucursal", "Vendedor", "Cliente",
      "DNI", "CUIL", "Tipo", "Estado", "Monto ($)",
      "Cuotas", "TNA (%)", "Días Mora", "Punitorio ($)"
    ]);

    for (const op of ops) {
      detalleRows.push([
        op.id.slice(0, 8).toUpperCase(),
        fmtFecha(op._fecha),
        sucursalesMap[op.sucursalId] || "Sin sucursal",
        usuariosMap[op.vendedorId]   || op.vendedorId?.slice(0, 8) || "—",
        op.cliente?.nombre || "—",
        op.cliente?.dni    || "—",
        op.cliente?.cuil   || "—",
        op.tipo            || "—",
        op.estado          || "—",
        fmt(op.financiero?.montoSolicitado || 0),
        op.financiero?.cuotas || 0,
        op.financiero?.tna    || 0,
        op.cobranzas?.diasMora           || 0,
        fmt(op.cobranzas?.punitorioAcumulado || 0),
      ]);
    }

    const ws2 = XLSX.utils.aoa_to_sheet(detalleRows);
    ws2["!cols"] = [12,12,20,20,28,12,16,12,18,14,8,8,10,14].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws2, "Detalle Operaciones");

    // ── HOJA 3: RANKING DE VENDEDORES ────────────────────────────────────────
    const vendedorMap: Record<string, {
      nombre: string; sucursal: string;
      total: number; monto: number; mora: number; finalizado: number;
    }> = {};

    for (const op of ops) {
      const vid = op.vendedorId || "desconocido";
      if (!vendedorMap[vid]) {
        vendedorMap[vid] = {
          nombre:    usuariosMap[vid]   || vid.slice(0, 8),
          sucursal:  sucursalesMap[op.sucursalId] || "Sin sucursal",
          total: 0, monto: 0, mora: 0, finalizado: 0,
        };
      }
      vendedorMap[vid].total++;
      if (["LIQUIDADO","FINALIZADO"].includes(op.estado))
        vendedorMap[vid].monto += (op.financiero?.montoSolicitado || 0);
      if (op.estado === "EN_MORA")     vendedorMap[vid].mora++;
      if (op.estado === "FINALIZADO")  vendedorMap[vid].finalizado++;
    }

    const rankingRows: any[][] = [];
    rankingRows.push(["#", "Vendedor", "Sucursal", "Ops totales", "Monto liquidado ($)", "En mora", "Finalizados"]);

    Object.values(vendedorMap)
      .sort((a, b) => b.monto - a.monto)
      .forEach((v, i) => {
        rankingRows.push([
          i + 1, v.nombre, v.sucursal,
          v.total, fmt(v.monto), v.mora, v.finalizado
        ]);
      });

    const ws3 = XLSX.utils.aoa_to_sheet(rankingRows);
    ws3["!cols"] = [5, 25, 20, 14, 22, 10, 12].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws3, "Ranking Vendedores");

    // ── HOJA 4: MORA DETALLADA ────────────────────────────────────────────────
    const moraOps = ops.filter(o => o.cobranzas?.diasMora > 0 || o.estado === "EN_MORA");
    const moraRows: any[][] = [];
    moraRows.push([
      "Legajo", "Cliente", "DNI", "Sucursal", "Vendedor",
      "Días Mora", "Punitorio ($)", "Moratorio ($)", "Total Recargo ($)",
      "Monto Original ($)", "Estado"
    ]);

    for (const op of moraOps) {
      moraRows.push([
        op.id.slice(0, 8).toUpperCase(),
        op.cliente?.nombre || "—",
        op.cliente?.dni    || "—",
        sucursalesMap[op.sucursalId] || "Sin sucursal",
        usuariosMap[op.vendedorId]   || "—",
        op.cobranzas?.diasMora           || 0,
        fmt(op.cobranzas?.punitorioAcumulado  || 0),
        fmt(op.cobranzas?.moratorioAcumulado  || 0),
        fmt(op.cobranzas?.totalRecargo        || 0),
        fmt(op.financiero?.montoSolicitado    || 0),
        op.estado,
      ]);
    }

    const ws4 = XLSX.utils.aoa_to_sheet(moraRows);
    ws4["!cols"] = [12,28,12,20,20,10,14,14,16,18,18].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws4, "Mora Detallada");

    // ── Generar buffer ────────────────────────────────────────────────────────
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fechaStr = new Date().toISOString().slice(0, 10);

    return new NextResponse(buf, {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte-${fechaStr}.xlsx"`,
      },
    });

  } catch (error: any) {
    console.error("[Reportes Excel]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
