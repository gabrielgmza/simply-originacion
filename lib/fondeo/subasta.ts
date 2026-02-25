export const obtenerOfertasFondeo = (monto: number, fondeadores: any[]) => {
  return fondeadores
    .filter(f => f.activo && monto <= f.limiteMaximo)
    .map(f => {
      // Cálculo de cuota según TNA del fondeador
      const tasaMensual = (f.tasaInteres / 100) / 12;
      const cuotaPura = (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -f.plazoMax));
      
      // Gastos y Seguros PORCENTUALES (según tus notas)
      const gastos = monto * (f.tasaGastos / 100);
      const seguro = monto * (f.tasaSeguro / 100);
      
      return {
        fondeadorId: f.id,
        nombre: f.nombre,
        cuotaFinal: cuotaPura + (gastos / f.plazoMax) + (seguro / f.plazoMax),
        tna: f.tasaInteres,
        cft: f.cftCalculado,
        scoringRequerido: f.scoringMinimo,
        comisionSimply: f.esquemaComision // Porcentual sobre bruta/neta
      };
    })
    .sort((a, b) => a.cuotaFinal - b.cuotaFinal); // El cliente ve primero lo más barato
};
