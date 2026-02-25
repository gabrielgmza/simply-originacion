export const calcularOperacion = (monto: number, config: any) => {
  // Gastos y Seguros PORCENTUALES (No fijos) según tus notas
  const tasaGasto = config?.tasaOtorgamiento || 0.10; // 10% por defecto
  const tasaSeguro = config?.tasaSeguroVida || 0.015; // 1.5% por defecto
  const tasaInteres = (config?.tasaInteresBase || 145) / 100;

  const gastoOtorgamiento = monto * tasaGasto; 
  const seguroVida = monto * tasaSeguro;
  const interesesBase = monto * tasaInteres;
  
  // CFT Total: Cálculo automático (Suma de todos los costos sobre el capital)
  const costoTotalFinanciero = ((interesesBase + gastoOtorgamiento + seguroVida) / monto) * 100;

  return {
    capitalNeto: monto,
    gastosOtorgamiento: gastoOtorgamiento,
    seguroVida: seguroVida,
    totalALiquidar: monto + gastoOtorgamiento + seguroVida,
    cft: costoTotalFinanciero.toFixed(2),
    punitorioDiario: 0.12 // 0.12% diario según requerimiento
  };
};
