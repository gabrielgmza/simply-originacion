import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { cuil } = await request.json();
    
    if (!cuil || cuil.length < 10) {
      return NextResponse.json({ error: "CUIL/CUIT invalido" }, { status: 400 });
    }

    const [resDeudas, resCheques] = await Promise.all([
      fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`),
      fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/ChequesRechazados/${cuil}`)
    ]);

    let deudasData = null;
    let chequesData = null;
    let peorSituacion = 1; 
    let montoTotal = 0;
    let tieneCheques = false;
    let denominacion = "Desconocido";

    if (resDeudas.ok) {
      const json = await resDeudas.json();
      if (json.status === 0 && json.results && json.results.periodos?.length > 0) {
        deudasData = json.results;
        denominacion = json.results.denominacion;
        
        const ultimoPeriodo = json.results.periodos[0];
        ultimoPeriodo.entidades.forEach((entidad: any) => {
          if (entidad.situacion > peorSituacion) peorSituacion = entidad.situacion;
          montoTotal += (entidad.monto * 1000); 
        });
      }
    }

    if (resCheques.ok) {
      const json = await resCheques.json();
      if (json.status === 0 && json.results) {
        chequesData = json.results;
        tieneCheques = true;
      }
    }

    return NextResponse.json({
      cuil,
      denominacionBCRA: denominacion,
      situacionCrediticia: peorSituacion,
      montoDeudaInformada: montoTotal,
      tieneChequesRechazados: tieneCheques,
      rawDeudas: deudasData,
      rawCheques: chequesData
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error al consultar API BCRA:", error);
    return NextResponse.json({ error: "Fallo la conexion con el Banco Central" }, { status: 500 });
  }
}
