export const calcularComisionSimply = (operacion: any, esquema: any) => {
  const montoBruto = operacion.financiero.totalALiquidar;
  const montoNeto = operacion.financiero.montoSolicitado;

  switch (esquema.tipo) {
    case 'PORCENTAJE_BRUTO':
      return montoBruto * (esquema.valor / 100);
    case 'PORCENTAJE_NETO':
      return montoNeto * (esquema.valor / 100);
    case 'ABONO_MENSUAL':
      // El abono se calcula aparte en el cierre de mes
      return 0;
    default:
      return 0;
  }
};
