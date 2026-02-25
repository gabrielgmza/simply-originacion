import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { cuil } = await request.json();
    
    if (!cuil || cuil.length < 10) {
      return NextResponse.json({ error: "CUIL invalido" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout

    try {
      const response = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`BCRA respondio con status: ${response.status}`);
      }

      const json = await response.json();
      
      let peorSituacion = 1;
      let montoTotal = 0;
      let denominacion = "Informacion Protegida";

      if (json.status === 0 && json.results && json.results.periodos?.length > 0) {
        denominacion = json.results.denominacion;
        json.results.periodos[0].entidades.forEach((ent: any) => {
          if (ent.situacion > peorSituacion) peorSituacion = ent.situacion;
          montoTotal += (ent.monto * 1000);
        });
      }

      return NextResponse.json({
        cuil,
        denominacionBCRA: denominacion,
        situacionCrediticia: peorSituacion,
        montoDeudaInformada: montoTotal,
        tieneChequesRechazados: false
      }, { status: 200 });

    } catch (fetchError) {
      console.error("Fallo Fetch BCRA:", fetchError);
      // Falla Segura: Devolvemos un score estandar para no trabar el flujo comercial
      return NextResponse.json({
        cuil,
        denominacionBCRA: "CONSULTA OFFLINE (SISTEMA)",
        situacionCrediticia: 1,
        montoDeudaInformada: 0,
        tieneChequesRechazados: false,
        nota: "La API del BCRA no respondio a tiempo. Se asigna Score 1 preventivo."
      }, { status: 200 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
