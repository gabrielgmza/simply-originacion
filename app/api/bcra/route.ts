// app/api/bcra/route.ts
import { NextResponse } from "next/server";

function calcularCuil(dni: string, sexo: string): string {
  const dniStr = dni.padStart(8, "0");
  let prefijo = sexo === "F" ? "27" : "20";
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  const base = prefijo + dniStr;
  for (let i = 0; i < 10; i++) suma += parseInt(base[i]) * mult[i];
  let digito = 11 - (suma % 11);
  if (digito === 11) digito = 0;
  if (digito === 10) {
    prefijo = "23";
    digito = sexo === "F" ? 4 : 9;
  }
  return prefijo + dniStr + digito.toString();
}

async function fetchBcra(path: string) {
  const url = `https://api.bcra.gob.ar${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    // Vercel no soporta rejectUnauthorized — usamos fetch nativo que acepta el cert del BCRA
  });
  return res;
}

export async function POST(req: Request) {
  try {
    const { documento, sexo } = await req.json();
    const docLimpio = documento.replace(/[^0-9]/g, "");
    const cuil = docLimpio.length >= 10 ? docLimpio : calcularCuil(docLimpio, sexo || "M");

    console.log(`[BCRA] Consultando CUIL: ${cuil}`);

    // Consulta deudas y cheques en paralelo
    const [resDeudas, resCheques] = await Promise.allSettled([
      fetchBcra(`/centraldedeudores/v1.0/Deudas/${cuil}`),
      fetchBcra(`/centraldedeudores/v1.0/Deudas/ChequesRechazados/${cuil}`),
    ]);

    let bcraData: any = {
      error:         false,
      tieneDeudas:   false,
      peorSituacion: "1",
      nombre:        "",
      cuil,
      detalles:      [],
      cheques:       [],
      tieneChequesRechazados: false,
    };

    // Procesar deudas
    if (resDeudas.status === "fulfilled") {
      const r = resDeudas.value;
      if (r.status === 200) {
        const data = await r.json();
        bcraData.nombre = data.results?.denominacion || "";
        const periodos = data.results?.periodos || [];
        if (periodos.length > 0) {
          const ultimo = periodos[0];
          const entidades = ultimo.entidades || [];
          if (entidades.length > 0) {
            bcraData.tieneDeudas = true;
            bcraData.detalles = entidades.map((e: any) => ({
              entidad:      e.entidad,
              situacion:    e.situacion,
              monto:        (e.monto || 0) * 1000, // viene en miles
              diasAtraso:   e.diasAtrasoPago || 0,
              periodo:      ultimo.periodo,
            }));
            const situaciones = entidades.map((e: any) => parseInt(e.situacion));
            bcraData.peorSituacion = Math.max(...situaciones).toString();
          }
        }
      } else if (r.status === 404) {
        // 404 = sin deudas, cliente limpio — esto es correcto
        bcraData.tieneDeudas = false;
        bcraData.peorSituacion = "1";
      } else {
        console.warn(`[BCRA Deudas] Status inesperado: ${r.status}`);
      }
    } else {
      console.error("[BCRA Deudas] Error:", resDeudas.reason);
    }

    // Procesar cheques
    if (resCheques.status === "fulfilled") {
      const r = resCheques.value;
      if (r.status === 200) {
        const data = await r.json();
        if (!bcraData.nombre) bcraData.nombre = data.results?.denominacion || "";
        const causales = data.results?.causales || [];
        const todos: any[] = [];
        causales.forEach((c: any) => {
          c.entidades?.forEach((ent: any) => {
            ent.detalle?.forEach((d: any) => {
              todos.push({
                causal:       c.causal,
                nroCheque:    d.nroCheque,
                monto:        d.monto,
                fechaRechazo: d.fechaRechazo,
                fechaPago:    d.fechaPago || null,
              });
            });
          });
        });
        bcraData.cheques = todos;
        bcraData.tieneChequesRechazados = todos.length > 0;
      }
      // 404 en cheques = sin cheques rechazados, normal
    }

    return NextResponse.json({ success: true, bcra: bcraData });
  } catch (error: any) {
    console.error("[BCRA] Error:", error.message);
    return NextResponse.json({
      success: false,
      error: true,
      mensaje: `Error al consultar BCRA: ${error.message}`,
    }, { status: 200 });
  }
}
