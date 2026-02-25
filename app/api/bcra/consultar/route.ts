import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { cuil } = await request.json();
    
    if (!cuil || cuil.length < 10) {
      return NextResponse.json({ error: "CUIL/CUIT invalido" }, { status: 400 });
    }

    // El BCRA requiere un User-Agent real para no bloquear la peticion
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const [resDeudas, resCheques] = await Promise.all([
      fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`, { headers }),
      fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/ChequesRechazados/${cuil}`, { headers })
    ]);

    let peorSituacion = 1; 
    let montoTotal = 0;
    let tieneCheques = false;
    let denominacion = "Desconocido";

    if (resDeudas.ok) {
      const json = await resDeudas.json();
      if (json.status === 0 && json.results && json.results.periodos?.length > 0) {
        denominacion = json.results.denominacion;
        json.results.periodos[0].entidades.forEach((entidad: any) => {
          if (entidad.situacion > peorSituacion) peorSituacion = entidad.situacion;
          montoTotal += (entidad.monto * 1000); 
        });
      }
    }

    if (resCheques.ok) {
      const json = await resCheques.json();
      if (json.status === 0 && json.results) {
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

  } catch (error: any) {
    console.error("Error en API BCRA:", error);
    return NextResponse.json({ error: "Fallo la conexion con el Banco Central" }, { status: 500 });
  }
}
