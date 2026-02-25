import { NextResponse } from "next/server";
export async function POST(request: Request) {
  try {
    const { cuil } = await request.json();
    if (!cuil) return NextResponse.json({ error: "CUIL Requerido" }, { status: 400 });
    const res = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`);
    if (!res.ok) throw new Error();
    const json = await res.json();
    let peor = 1;
    if (json.results?.periodos?.[0]) {
      json.results.periodos[0].entidades.forEach((e: any) => { if (e.situacion > peor) peor = e.situacion; });
    }
    return NextResponse.json({ denominacionBCRA: json.results?.denominacion || "CLIENTE", situacionCrediticia: peor, montoDeudaInformada: 0, tieneChequesRechazados: false });
  } catch (e) {
    return NextResponse.json({ denominacionBCRA: "MODO OFFLINE", situacionCrediticia: 1, montoDeudaInformada: 0, tieneChequesRechazados: false });
  }
}
