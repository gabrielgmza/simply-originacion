import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { cuil } = await request.json();
    if (!cuil || cuil.length < 10) return NextResponse.json({ error: "CUIL invalido" }, { status: 400 });

    const [resDeudas, resCheques] = await Promise.all([
      fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`),
      fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/ChequesRechazados/${cuil}`)
    ]);

    let peorSituacion = 1;
    let montoTotal = 0;
    let tieneCheques = false;

    if (resDeudas.ok) {
      const json = await resDeudas.json();
      if (json.results?.periodos?.[0]) {
        json.results.periodos[0].entidades.forEach((ent: any) => {
          if (ent.situacion > peorSituacion) peorSituacion = ent.situacion;
          montoTotal += (ent.monto * 1000);
        });
      }
    }

    if (resCheques.ok) {
      const json = await resCheques.json();
      if (json.results?.cantidad_cheques > 0) tieneCheques = true;
    }

    return NextResponse.json({
      cuil,
      denominacionBCRA: "Verificado BCRA",
      situacionCrediticia: peorSituacion,
      montoDeudaInformada: montoTotal,
      tieneChequesRechazados: tieneCheques
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Fallo conexion BCRA" }, { status: 500 });
  }
}
