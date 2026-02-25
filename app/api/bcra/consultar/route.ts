import { NextResponse } from "next/server";
export async function POST(request: Request) {
  try {
    const { cuil } = await request.json();
    const res = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`);
    if (!res.ok) return NextResponse.json({ denominacionBCRA: "CONSULTA OFFLINE", situacionCrediticia: 1, montoDeudaInformada: 0 });
    const json = await res.json();
    let peor = 1; let monto = 0;
    if (json.results?.periodos?.[0]) {
      json.results.periodos[0].entidades.forEach((e: any) => { if (e.situacion > peor) peor = e.situacion; monto += e.monto * 1000; });
    }
    return NextResponse.json({ denominacionBCRA: json.results?.denominacion || "Verificado", situacionCrediticia: peor, montoDeudaInformada: monto });
  } catch (e) { return NextResponse.json({ situacionCrediticia: 1, montoDeudaInformada: 0 }); }
}
