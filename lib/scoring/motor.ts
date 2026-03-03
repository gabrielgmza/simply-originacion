// lib/scoring/motor.ts
// Motor de scoring crediticio interno de Paysur
// Puntaje 0-1000. Cada variable tiene un peso % configurable por entidad.
// La suma de pesos debe ser 100%.

export interface ConfigScoring {
  // Pesos (deben sumar 100)
  pesoEdad:              number; // %
  pesoAntiguedadLaboral: number;
  pesoIngresos:          number;
  pesoEstadoCivil:       number;
  pesoBcra:              number;
  pesoComportamiento:    number; // historial interno

  // Umbrales
  umbralAprobado:        number; // ≥ este puntaje → APROBADO (ej: 650)
  umbralRevision:        number; // entre umbralRevision y umbralAprobado → REVISION (ej: 500)
                                 // < umbralRevision → RECHAZADO

  // Parámetros de referencia para normalizar
  edadMinima:            number; // edad desde la que se considera apta (ej: 22)
  edadMaxima:            number; // edad máxima óptima (ej: 60)
  ingresosRef:           number; // ingreso mensual considerado "máximo" para normalizar (ej: 500000)
  antiguedadRef:         number; // meses de antigüedad considerados "máximos" (ej: 120 = 10 años)
}

export const CONFIG_SCORING_DEFAULT: ConfigScoring = {
  pesoEdad:              10,
  pesoAntiguedadLaboral: 20,
  pesoIngresos:          25,
  pesoEstadoCivil:       5,
  pesoBcra:              25,
  pesoComportamiento:    15,
  umbralAprobado:        650,
  umbralRevision:        450,
  edadMinima:            22,
  edadMaxima:            60,
  ingresosRef:           500_000,
  antiguedadRef:         120,
};

export interface InputsScoring {
  // Cliente
  fechaNacimiento?:  string;    // ISO date
  antiguedadMeses?:  number;    // meses en el trabajo actual
  ingresoMensual?:   number;    // $ bruto mensual
  estadoCivil?:      "CASADO" | "SOLTERO" | "DIVORCIADO" | "VIUDO" | "UNION_LIBRE";

  // BCRA
  situacionBcraActual?:   number; // 1-6
  peorSituacionHistorica?: number; // 1-6

  // Comportamiento interno
  opsPreviasEntidad?:     number; // créditos anteriores en la misma entidad
  pagosPuntuales?:        number; // cantidad de cuotas pagadas a término
  cuotasTotalesPrevias?:  number; // total de cuotas de créditos anteriores
  moraPrevia?:            boolean; // tuvo mora en esta entidad alguna vez
  diasMoraMaxima?:        number;  // máximo días en mora (historial)
}

export interface ResultadoScoring {
  puntaje:       number;    // 0-1000
  decision:      "APROBADO" | "REVISION" | "RECHAZADO";
  breakdown: {
    categoria:   string;
    puntajeParcial: number; // 0-100 (normalizado dentro de la categoría)
    peso:        number;    // % del total
    aporte:      number;    // puntaje ponderado aportado
    detalle:     string;
  }[];
  alertas:       string[];  // mensajes de riesgo relevantes
}

// ── Función principal ─────────────────────────────────────────────────────────
export function calcularScoring(
  inputs: InputsScoring,
  config: Partial<ConfigScoring> = {}
): ResultadoScoring {
  const cfg: ConfigScoring = { ...CONFIG_SCORING_DEFAULT, ...config };

  const breakdown: ResultadoScoring["breakdown"] = [];
  const alertas: string[] = [];

  // ── 1. EDAD ──────────────────────────────────────────────────────────────────
  let puntajeEdad = 0;
  let detalleEdad = "Sin datos";
  if (inputs.fechaNacimiento) {
    const hoy  = new Date();
    const nac  = new Date(inputs.fechaNacimiento);
    const edad = Math.floor((hoy.getTime() - nac.getTime()) / (365.25 * 24 * 3600 * 1000));
    if (edad < cfg.edadMinima) {
      puntajeEdad = 20;
      detalleEdad = `${edad} años — menor al mínimo (${cfg.edadMinima})`;
      alertas.push(`Edad ${edad} años — por debajo del mínimo recomendado`);
    } else if (edad <= cfg.edadMaxima) {
      // Puntaje máximo entre edadMinima y edadMaxima, decae suavemente
      puntajeEdad = 100;
      detalleEdad = `${edad} años — rango óptimo`;
    } else if (edad <= cfg.edadMaxima + 10) {
      puntajeEdad = 70;
      detalleEdad = `${edad} años — rango aceptable`;
    } else {
      puntajeEdad = 40;
      detalleEdad = `${edad} años — mayor al óptimo (${cfg.edadMaxima})`;
      alertas.push(`Edad ${edad} años — evaluar capacidad de repago a largo plazo`);
    }
  }
  const aporteEdad = (puntajeEdad * cfg.pesoEdad) / 100;
  breakdown.push({ categoria: "Edad", puntajeParcial: puntajeEdad, peso: cfg.pesoEdad, aporte: aporteEdad, detalle: detalleEdad });

  // ── 2. ANTIGÜEDAD LABORAL ────────────────────────────────────────────────────
  let puntajeAnt = 0;
  let detalleAnt = "Sin datos";
  if (inputs.antiguedadMeses !== undefined) {
    const m = inputs.antiguedadMeses;
    puntajeAnt = Math.min(100, Math.round((m / cfg.antiguedadRef) * 100));
    detalleAnt = m < 6   ? `${m} meses — muy baja antigüedad` :
                 m < 24  ? `${m} meses — antigüedad básica` :
                 m < 60  ? `${m} meses — antigüedad aceptable` :
                            `${m} meses — antigüedad sólida`;
    if (m < 6) alertas.push("Antigüedad laboral menor a 6 meses");
  }
  const aporteAnt = (puntajeAnt * cfg.pesoAntiguedadLaboral) / 100;
  breakdown.push({ categoria: "Antigüedad laboral", puntajeParcial: puntajeAnt, peso: cfg.pesoAntiguedadLaboral, aporte: aporteAnt, detalle: detalleAnt });

  // ── 3. INGRESOS ───────────────────────────────────────────────────────────────
  let puntajeIng = 0;
  let detalleIng = "Sin datos";
  if (inputs.ingresoMensual !== undefined) {
    puntajeIng = Math.min(100, Math.round((inputs.ingresoMensual / cfg.ingresosRef) * 100));
    detalleIng = `$${inputs.ingresoMensual.toLocaleString("es-AR")} / mes`;
    if (inputs.ingresoMensual < cfg.ingresosRef * 0.15)
      alertas.push("Ingresos muy bajos en relación a la referencia de la entidad");
  }
  const aporteIng = (puntajeIng * cfg.pesoIngresos) / 100;
  breakdown.push({ categoria: "Ingresos", puntajeParcial: puntajeIng, peso: cfg.pesoIngresos, aporte: aporteIng, detalle: detalleIng });

  // ── 4. ESTADO CIVIL ───────────────────────────────────────────────────────────
  const mapaEstadoCivil: Record<string, number> = {
    CASADO:      90,
    UNION_LIBRE: 75,
    SOLTERO:     70,
    DIVORCIADO:  60,
    VIUDO:       55,
  };
  const puntajeEC   = mapaEstadoCivil[inputs.estadoCivil || ""] ?? 60;
  const detalleEC   = inputs.estadoCivil ? inputs.estadoCivil.replace(/_/g, " ") : "Sin datos";
  const aporteEC    = (puntajeEC * cfg.pesoEstadoCivil) / 100;
  breakdown.push({ categoria: "Estado civil", puntajeParcial: puntajeEC, peso: cfg.pesoEstadoCivil, aporte: aporteEC, detalle: detalleEC });

  // ── 5. BCRA ───────────────────────────────────────────────────────────────────
  let puntajeBcra = 100;
  let detalleBcra = "Sin antecedentes BCRA";
  const sit    = inputs.situacionBcraActual    ?? 1;
  const peorSit = inputs.peorSituacionHistorica ?? 1;

  if (sit === 1 && peorSit === 1) {
    puntajeBcra = 100; detalleBcra = "Situación 1 — Sin deudas";
  } else if (sit <= 2 && peorSit <= 2) {
    puntajeBcra = 70; detalleBcra = `Situación ${sit} — Atraso leve`;
    alertas.push("Presenta deuda en situación 2 en el BCRA");
  } else if (sit === 3 || peorSit === 3) {
    puntajeBcra = 35; detalleBcra = `Situación ${sit} — Con problema`;
    alertas.push("⚠ Situación BCRA 3 — con problemas de pago");
  } else {
    puntajeBcra = 0; detalleBcra = `Situación ${sit} — Irrecuperable`;
    alertas.push("🚨 Situación BCRA 4/5/6 — riesgo muy alto");
  }
  // Penalización adicional por historial
  if (peorSit > sit) {
    puntajeBcra = Math.max(0, puntajeBcra - 10);
    detalleBcra += ` (peor histórico: sit. ${peorSit})`;
  }
  const aporteBcra = (puntajeBcra * cfg.pesoBcra) / 100;
  breakdown.push({ categoria: "BCRA", puntajeParcial: puntajeBcra, peso: cfg.pesoBcra, aporte: aporteBcra, detalle: detalleBcra });

  // ── 6. COMPORTAMIENTO INTERNO ─────────────────────────────────────────────────
  let puntajeComp = 60; // base si no hay historial
  let detalleComp = "Sin historial previo en la entidad";

  if ((inputs.opsPreviasEntidad ?? 0) > 0) {
    const tasaPuntualidad = (inputs.cuotasTotalesPrevias ?? 0) > 0
      ? ((inputs.pagosPuntuales ?? 0) / (inputs.cuotasTotalesPrevias ?? 1))
      : 1;

    if (inputs.moraPrevia) {
      const diasMora = inputs.diasMoraMaxima ?? 0;
      puntajeComp = diasMora > 60 ? 10 : diasMora > 30 ? 30 : 50;
      detalleComp = `${inputs.opsPreviasEntidad} créditos previos — tuvo mora (máx ${diasMora} días)`;
      alertas.push(`Registra mora previa en la entidad (${diasMora} días máximo)`);
    } else {
      puntajeComp = Math.round(60 + tasaPuntualidad * 40); // 60-100
      detalleComp = `${inputs.opsPreviasEntidad} créditos — ${Math.round(tasaPuntualidad * 100)}% puntualidad`;
      if (tasaPuntualidad === 1) detalleComp += " ✓ cliente ejemplar";
    }
  }
  const aporteComp = (puntajeComp * cfg.pesoComportamiento) / 100;
  breakdown.push({ categoria: "Comportamiento interno", puntajeParcial: puntajeComp, peso: cfg.pesoComportamiento, aporte: aporteComp, detalle: detalleComp });

  // ── Puntaje total (escala 0-1000) ─────────────────────────────────────────────
  const sumaAportes = breakdown.reduce((a, b) => a + b.aporte, 0);
  const puntaje     = Math.round(sumaAportes * 10); // 0-100 → 0-1000

  // ── Decisión ──────────────────────────────────────────────────────────────────
  const decision: ResultadoScoring["decision"] =
    puntaje >= cfg.umbralAprobado ? "APROBADO" :
    puntaje >= cfg.umbralRevision  ? "REVISION" : "RECHAZADO";

  return { puntaje, decision, breakdown, alertas };
}

// ── Helper: color/label por decisión ──────────────────────────────────────────
export function colorDecision(decision: ResultadoScoring["decision"]) {
  return decision === "APROBADO"  ? { bg: "bg-green-900/30", text: "text-green-400",  border: "border-green-900/50" } :
         decision === "REVISION"  ? { bg: "bg-yellow-900/30", text: "text-yellow-400", border: "border-yellow-900/50" } :
                                    { bg: "bg-red-900/30",    text: "text-red-400",    border: "border-red-900/50"  };
}
