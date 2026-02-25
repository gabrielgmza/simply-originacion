export const camposPdfExtendido = (cliente: any, financiero: any) => {
  return {
    "TITULAR_NOMBRE_COMPLETO": `${cliente.nombre1} ${cliente.nombre2 || ''} ${cliente.apellidoPaterno} ${cliente.apellidoMaterno}`,
    "DNI_CUIL": cliente.dni,
    "DOMICILIO": `${cliente.direccion}, ${cliente.localidad}, ${cliente.provincia} (CP: ${cliente.cp})`,
    "TELEFONOS": `Personal: ${cliente.telefono} | Laboral: ${cliente.telLaboral}`,
    "INFO_BANCARIA": `Banco: ${cliente.banco} | CBU: ${cliente.cbu}`,
    "MATRIZ_FINANCIERA": {
      "TNA": `${financiero.tna}%`,
      "CFT": `${financiero.cft}%`,
      "GASTOS_OTORGAMIENTO": `$${financiero.gastos.toLocaleString()}`,
      "SEGURO_VIDA": `$${financiero.seguro.toLocaleString()}`,
      "PUNITORIO_DIARIO": "0.12%"
    }
  };
};
