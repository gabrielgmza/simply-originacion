export const generarDatosLibreDeuda = (operacion: any, entidad: any) => {
  if (operacion.financiero.saldoPendiente > 0) {
    throw new Error("No se puede emitir Libre Deuda: Existe saldo pendiente.");
  }

  return {
    fecha_emision: new Date().toLocaleDateString('es-AR'),
    nro_legajo: operacion.id.substring(0, 8).toUpperCase(),
    cliente_nombre: `${operacion.cliente.nombre1} ${operacion.cliente.apellidoPaterno}`,
    dni: operacion.cliente.dni,
    entidad_emisora: entidad.nombre,
    cuit_entidad: entidad.cuit,
    leyenda: "Se deja constancia que el titular no adeuda suma alguna por el concepto del crédito de referencia, quedando canceladas todas las obligaciones contractuales."
  };
};
