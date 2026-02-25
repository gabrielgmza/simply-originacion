export const calcularComisionVendedor = (operacion: any, esquema: any) => {
  const capitalNeto = operacion.financiero.montoSolicitado;
  const capitalBruto = operacion.financiero.totalALiquidar;
  const valorComision = esquema.valor || 0;

  switch (esquema.base) {
    case 'NETO':
      return capitalNeto * (valorComision / 100);
    case 'BRUTO':
      return capitalBruto * (valorComision / 100);
    case 'FIJO':
      return valorComision; // Monto plano por legajo liquidado
    default:
      return 0;
  }
};
