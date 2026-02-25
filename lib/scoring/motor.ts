export function calcularScoringInterno(datosBcra: any, historialSimply: any, datosLaborales: any) {
  let score = 500; // Base neutra

  // Ponderación BCRA
  if (datosBcra.situacion === 1) score += 200;
  if (datosBcra.situacion >= 3) score -= 300;

  // Ponderación Historial Interno (Simply)
  if (historialSimply.creditosPagos > 2) score += 150;
  if (historialSimply.promedioMora > 5) score -= 100;

  // Resultado: Tasa Sugerida
  let tasaAjustada = 120; // Tasa base
  if (score > 800) tasaAjustada = 90; // Cliente Premium
  if (score < 400) tasaAjustada = 160; // Cliente de Riesgo

  return { score, tasaAjustada, categoria: score > 700 ? 'A+' : score > 400 ? 'B' : 'C' };
}
