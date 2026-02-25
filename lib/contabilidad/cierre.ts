export const calcularCierreCaja = (pagos: any[]) => {
  return pagos.reduce((acc, pago) => {
    return {
      totalRecaudado: acc.totalRecaudado + pago.monto,
      capitalRecuperado: acc.capitalRecuperado + (pago.distribucion?.capital || 0),
      interesesMoraRecaudados: acc.interesesMoraRecaudados + (pago.distribucion?.mora || 0),
      comisionesSimply: acc.comisionesSimply + (pago.comisionSimply || 0)
    };
  }, { totalRecaudado: 0, capitalRecuperado: 0, interesesMoraRecaudados: 0, comisionesSimply: 0 });
};
