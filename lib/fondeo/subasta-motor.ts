// lib/fondeo/subasta-motor.ts
// Motor de subasta: dado un monto, cuotas, score y PRODUCTO, calcula ofertas y elige la óptima.

export interface Fondeador {
  id:             string;
  entidadId:      string;
  nombre:         string;
  activo:         boolean;
  productos:      string[];  // ["CUAD", "PRIVADO", "ADELANTO"] — líneas habilitadas
  tnaPropia:      number;    // TNA %
  plazoMaximo:    number;    // cuotas máx
  montoMinimo:    number;
  montoMaximo:    number;
  scoringMinimo:  number;    // puntaje mínimo requerido (0-1000)
  cupoMaximo:     number;    // exposición máxima total $ en cartera
  cupoUsado:      number;    // cartera activa asignada actualmente $
  comision: {
    tipo:  "PORCENTUAL" | "FIJA";
    valor: number;
  };
  emailNotificacion?: string;
  portalPermisos?: PortalPermisos;
}

export interface PortalPermisos {
  verCartera:       boolean;
  verLegajos:       boolean;
  verPlanCuotas:    boolean;
  verEstadisticas:  boolean;
  verHistorial:     boolean;
  verContabilidad:  boolean;
  exportarExcel:    boolean;
}

export const PERMISOS_DEFAULT: PortalPermisos = {
  verCartera:      true,
  verLegajos:      false,
  verPlanCuotas:   true,
  verEstadisticas: true,
  verHistorial:    true,
  verContabilidad: false,
  exportarExcel:   false,
};

export interface OfertaFondeo {
  fondeadorId:   string;
  nombre:        string;
  tna:           number;
  cuotaFinal:    number;
  totalDevolver: number;
  cft:           number;
  comision:      number;
  cupoDisponible:number;
  esOptima:      boolean;
}

// ── Calcular ofertas ──────────────────────────────────────────────────────────
export function calcularOfertas(
  monto:        number,
  cuotas:       number,
  scoreCliente: number,
  fondeadores:  Fondeador[],
  producto?:    string       // "CUAD" | "PRIVADO" | "ADELANTO"
): OfertaFondeo[] {
  const ofertas: OfertaFondeo[] = [];

  for (const f of fondeadores) {
    if (!f.activo)                              continue;
    // Filtrar por producto si se especificó
    if (producto && f.productos?.length > 0 && !f.productos.includes(producto)) continue;
    if (monto < f.montoMinimo)                  continue;
    if (monto > f.montoMaximo)                  continue;
    if (cuotas > f.plazoMaximo)                 continue;
    if (scoreCliente < f.scoringMinimo)         continue;
    if ((f.cupoUsado + monto) > f.cupoMaximo)   continue;

    const TEM          = (f.tnaPropia / 100) / 12;
    const cuotaPura    = TEM > 0
      ? (monto * TEM * Math.pow(1 + TEM, cuotas)) / (Math.pow(1 + TEM, cuotas) - 1)
      : monto / cuotas;
    const totalDevolver = cuotaPura * cuotas;
    const cft           = ((totalDevolver / monto) - 1) * (12 / cuotas) * 100;

    const comision = f.comision?.tipo === "PORCENTUAL"
      ? monto * ((f.comision?.valor || 0) / 100)
      : (f.comision?.valor || 0);

    ofertas.push({
      fondeadorId:    f.id,
      nombre:         f.nombre,
      tna:            f.tnaPropia,
      cuotaFinal:     Math.round(cuotaPura),
      totalDevolver:  Math.round(totalDevolver),
      cft:            parseFloat(cft.toFixed(2)),
      comision:       Math.round(comision),
      cupoDisponible: f.cupoMaximo - f.cupoUsado,
      esOptima:       false,
    });
  }

  ofertas.sort((a, b) => a.cuotaFinal - b.cuotaFinal);
  if (ofertas.length > 0) ofertas[0].esOptima = true;

  return ofertas;
}

// ── Calcular contabilidad del fondeador ───────────────────────────────────────
export function calcularContabilidad(ops: any[]) {
  const capitalAsignado  = ops.reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
  const totalCobrado     = ops.reduce((a, o) => a + (o._totalPagado || 0), 0);
  const enMoraOps        = ops.filter(o => o.estado === "EN_MORA" || o.estado === "MORA");
  const capitalEnMora    = enMoraOps.reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);

  const interesDevengado = ops.reduce((a, o) => {
    const tna   = (o.fondeo?.tna || 0) / 100;
    const meses = o.fechaLiquidacion
      ? Math.max(0, (Date.now() - new Date(o.fechaLiquidacion?.toDate?.() || o.fechaLiquidacion).getTime()) / (30 * 86400000))
      : 0;
    return a + (o.financiero?.montoSolicitado || 0) * (tna / 12) * meses;
  }, 0);

  const capitalPendiente = capitalAsignado - totalCobrado;

  return {
    capitalAsignado:  Math.round(capitalAsignado),
    totalCobrado:     Math.round(totalCobrado),
    capitalPendiente: Math.round(capitalPendiente),
    interesDevengado: Math.round(interesDevengado),
    capitalEnMora:    Math.round(capitalEnMora),
    porcMora:         capitalAsignado > 0 ? parseFloat(((capitalEnMora / capitalAsignado) * 100).toFixed(1)) : 0,
  };
}
