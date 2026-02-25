export const calcularMoraDiaria = (saldoPendiente: number, tasaConfigurada: number) => {
  // tasaConfigurada viene de la entidad (ej: 0.12 o 0.15)
  const factorMora = tasaConfigurada / 100;
  const interesGenerado = saldoPendiente * factorMora;
  
  return {
    montoMora: interesGenerado,
    nuevoSaldo: saldoPendiente + interesGenerado
  };
};
