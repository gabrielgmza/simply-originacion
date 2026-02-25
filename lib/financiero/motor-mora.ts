export const calcularMoraDinamic = (saldo: number, tasaDiaria: number) => {
  const interes = saldo * (tasaDiaria / 100);
  return {
    interesGenerado: interes,
    saldoFinal: saldo + interes
  };
};
