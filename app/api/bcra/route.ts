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
  if (digito === 10) { prefijo = "23"; digito = sexo === "F" ? 4 : 9; }
  return prefijo + dniStr + digito.toString();
}

async function consultarCuil(cuil: string) {
  const [resDeudas, resCheques] = await Promise.allSettled([
    fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    }),
    fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/ChequesRechazados/${cuil}`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    }),
  ]);

  const resultado: any = {
    encontrado: false, cuil, nombre: "", peorSituacion: "1",
    tieneDeudas: false, detalles: [], cheques: [], tieneChequesRechazados: false,
  };

  if (resDeudas.status === "fulfilled" && resDeudas.value.status === 200) {
    const data = await resDeudas.value.json();
    if (data.results?.denominacion) {
      resultado.encontrado = true;
      resultado.nombre = data.results.denominacion;
      const entidadesVistas = new Set<string>();
      let peor = 1;
      for (const periodo of (data.results?.periodos || [])) {
        for (const e of (periodo.entidades || [])) {
          const key = `${e.entidad}-${periodo.periodo}`;
          if (!entidadesVistas.has(key)) {
            entidadesVistas.add(key);
            resultado.detalles.push({
              entidad: e.entidad, situacion: e.situacion,
              monto: (e.monto || 0) * 1000, diasAtraso: e.diasAtrasoPago || 0,
              periodo: periodo.periodo,
            });
            if (e.situacion > peor) peor = e.situacion;
          }
        }
      }
      if (resultado.detalles.length > 0) {
        resultado.tieneDeudas = true;
        resultado.peorSituacion = peor.toString();
      }
    }
  }

  if (resCheques.status === "fulfilled" && resCheques.value.status === 200) {
    const data = await resCheques.value.json();
    if (!resultado.nombre) resultado.nombre = data.results?.denominacion || "";
    const todos: any[] = [];
    (data.results?.causales || []).forEach((c: any) => {
      (c.entidades || []).forEach((ent: any) => {
        (ent.detalle || []).forEach((d: any) => {
          todos.push({ causal: c.causal, nroCheque: d.nroCheque, monto: d.monto, fechaRechazo: d.fechaRechazo });
        });
      });
    });
    resultado.cheques = todos;
    resultado.tieneChequesRechazados = todos.length > 0;
    if (todos.length > 0 && !resultado.encontrado) resultado.encontrado = true;
  }

  return resultado;
}

export async function POST(req: Request) {
  try {
    const { documento, sexo } = await req.json();
    const docLimpio = documento.replace(/[^0-9]/g, "");

    // Si ya viene CUIL de 11 dígitos, usarlo directo
    if (docLimpio.length >= 10) {
      const r = await consultarCuil(docLimpio);
      return NextResponse.json({ success: true, bcra: { ...r, error: false } });
    }

    // Consultar ambos sexos en paralelo para minimizar errores
    const cuilM = calcularCuil(docLimpio, "M");
    const cuilF = calcularCuil(docLimpio, "F");

    const [resM, resF] = await Promise.all([
      consultarCuil(cuilM),
      consultarCuil(cuilF),
    ]);

    // Prioridad: el que encontró nombre > el que tiene deudas > masculino por defecto
    let ganador = resM;
    if (!resM.encontrado && resF.encontrado) ganador = resF;
    else if (resM.encontrado && resF.encontrado) {
      // Ambos encontrados (raro) — usar el que tiene más detalles
      ganador = resF.detalles.length > resM.detalles.length ? resF : resM;
    }

    return NextResponse.json({ success: true, bcra: { ...ganador, error: false } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: true, mensaje: error.message }, { status: 200 });
  }
}
