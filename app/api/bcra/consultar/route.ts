import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { cuil } = await request.json();
    
    // Consultas en paralelo para máxima velocidad en producción
    const [resDeudas, resCheques] = await Promise.all([
      fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`),
      fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/ChequesRechazados/${cuil}`)
    ]);

    let peorSituacion = 1;
    let montoTotal = 0;
    let tieneCheques = false;
    let denominacion = "No Informado";

    if (resDeudas.ok) {
      const json = await resDeudas.json();
      if (json.status === 0 && json.results?.periodos?.length > 0) {
        denominacion = json.results.denominacion;
        // Buscamos la peor situación histórica reciente
        json.results.periodos[0].entidades.forEach((ent: any) => {
          if (ent.situacion > peorSituacion) peorSituacion = ent.situacion;
          montoTotal += (ent.monto * 1000); 
        });
      }
    }

    if (resCheques.ok) {
      const json = await resCheques.json();
      // Si la cantidad de cheques es mayor a 0, activamos la alerta
      if (json.results?.cantidad_cheques > 0 || json.results?.detalle?.length > 0) {
        tieneCheques = true;
      }
    }

    return NextResponse.json({
      cuil,
      denominacionBCRA: denominacion,
      situacionCrediticia: peorSituacion,
      montoDeudaInformada: montoTotal,
      tieneChequesRechazados: tieneCheques
    }, { status: 200 });

  } catch (error) {
    console.error("Error API BCRA:", error);
    return NextResponse.json({ error: "Fallo la conexion con el BCRA" }, { status: 500 });
  }
}
