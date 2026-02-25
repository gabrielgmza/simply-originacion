export const generarDataContrato = (cliente: any, financiero: any) => {
  return {
    // Datos de Identidad Separados
    titular: `${cliente.nombre1} ${cliente.nombre2 || ''} ${cliente.apellidoPaterno} ${cliente.apellidoMaterno}`,
    dni_cuil: cliente.dni,
    // Ubicación y Contacto
    domicilio: `${cliente.direccion}, ${cliente.localidad}, ${cliente.provincia}`,
    contacto: `Email: ${cliente.email} | Tel: ${cliente.telefono}`,
    // Datos Bancarios
    banco: cliente.banco,
    cbu: cliente.cbu,
    // Matriz Financiera Completa
    tna: `${financiero.tna}%`,
    cft: `${financiero.cft}%`,
    gastos_porcentuales: `$${financiero.gastos.toLocaleString()}`,
    punitorio_diario: "0.12%"
  };
};
