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

async function fetchBcra(path: string) {
  return fetch(`https://api.bcra.gob.ar${path}`, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
  });
}

export async function POST(req: Request) {
  try {
    const { documento, sexo } = await req.json();
    const docLimpio = documento.replace(/[^0-9]/g, "");
    const cuil = docLimpio.length >= 10 ? docLimpio : calcularCuil(docLimpio, sexo || "M");

    const [resDeudas, resCheques] = await Promise.allSettled([
      fetchBcra(`/centraldedeudores/v1.0/Deudas/${cuil}`),
      fetchBcra(`/centraldedeudores/v1.0/Deudas/ChequesRechazados/${cuil}`),
    ]);

    const bcraData: any = {
      error: false, tieneDeudas: false, peorSituacion: "1",
      nombre: "", cuil, detalles: [], cheques: [], tieneChequesRechazados: false,
    };

    // Procesar deudas — leer TODOS los períodos
    if (resDeudas.status === "fulfilled") {
      const r = resDeudas.value;
      if (r.status === 200) {
        const data = await r.json();
        bcraData.nombre = data.results?.denominacion || "";
        const periodos = data.results?.periodos || [];

        // Acumular entidades de todos los períodos, evitando duplicados por entidad
        const entidadesVistas = new Set<string>();
        let peor = 1;

        for (const periodo of periodos) {
          for (const e of (periodo.entidades || [])) {
            const key = `${e.entidad}-${periodo.periodo}`;
            if (!entidadesVistas.has(key)) {
              entidadesVistas.add(key);
              bcraData.detalles.push({
                entidad:    e.entidad,
                situacion:  e.situacion,
                monto:      (e.monto || 0) * 1000,
                diasAtraso: e.diasAtrasoPago || 0,
                periodo:    periodo.periodo,
              });
              if (e.situacion > peor) peor = e.situacion;
            }
          }
        }

        if (bcraData.detalles.length > 0) {
          bcraData.tieneDeudas = true;
          bcraData.peorSituacion = peor.toString();
        }
      }
      // 404 = sin deudas, normal
    }

    // Procesar cheques
    if (resCheques.status === "fulfilled") {
      const r = resCheques.value;
      if (r.status === 200) {
        const data = await r.json();
        if (!bcraData.nombre) bcraData.nombre = data.results?.denominacion || "";
        const todos: any[] = [];
        (data.results?.causales || []).forEach((c: any) => {
          (c.entidades || []).forEach((ent: any) => {
            (ent.detalle || []).forEach((d: any) => {
              todos.push({
                causal: c.causal, nroCheque: d.nroCheque,
                monto: d.monto, fechaRechazo: d.fechaRechazo, fechaPago: d.fechaPago || null,
              });
            });
          });
        });
        bcraData.cheques = todos;
        bcraData.tieneChequesRechazados = todos.length > 0;
      }
    }

    return NextResponse.json({ success: true, bcra: bcraData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: true, mensaje: error.message }, { status: 200 });
  }
}
