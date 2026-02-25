export function calcularLiquidacionMora(cuota: any, config: any) {
  const hoy = new Date();
  const vencimiento = new Date(cuota.fechaVencimiento.seconds * 1000);
  
  if (hoy <= vencimiento) return { diasMora: 0, interesPunitorio: 0, totalExigible: cuota.monto };

  const diasMora = Math.floor((hoy.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24));
  
  // Tasa diaria (Tasa mensual / 30)
  const tasaPunitoriaDiaria = (config.interesPunitorioPorc / 100) / 30;
  const tasaMoratoriaDiaria = (config.interesMoratorioPorc / 100) / 30;

  const punitorios = cuota.monto * tasaPunitoriaDiaria * diasMora;
  const moratorios = cuota.monto * tasaMoratoriaDiaria * diasMora;

  return {
    diasMora,
    punitorios,
    moratorios,
    totalExigible: cuota.monto + punitorios + moratorios
  };
}
