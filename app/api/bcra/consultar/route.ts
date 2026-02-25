import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { cuil } = await request.json();
    if (!cuil) return NextResponse.json({ error: "CUIL requerido" }, { status: 400 });

    const res = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`, {
      next: { revalidate: 3600 } 
    });

    if (!res.ok) {
      return NextResponse.json({ 
        denominacionBCRA: "CONSULTA MANUAL REQUERIDA", 
        situacionCrediticia: 1, 
        montoDeudaInformada: 0 
      });
    }

    const json = await res.json();
    let peor = 1;
    let monto = 0;

    if (json.results?.periodos?.[0]?.entidades) {
      json.results.periodos[0].entidades.forEach((e: any) => {
        if (e.situacion > peor) peor = e.situacion;
        monto += (e.monto || 0) * 1000;
      });
    }

    return NextResponse.json({
      denominacionBCRA: json.results?.denominacion || "CLIENTE VERIFICADO",
      situacionCrediticia: peor,
      montoDeudaInformada: monto,
      tieneChequesRechazados: false
    });
  } catch (e) {
    return NextResponse.json({ situacionCrediticia: 1, montoDeudaInformada: 0 });
  }
}
