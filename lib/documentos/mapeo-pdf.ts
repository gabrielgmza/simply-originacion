export const mapearDatosLegajo = (cliente: any, financiero: any, entidad: any) => {
  return {
    // Identidad Ramificada
    titular_completo: `${cliente.nombre1} ${cliente.nombre2 || ''} ${cliente.apellidoPaterno} ${cliente.apellidoMaterno}`,
    dni_cuil: cliente.dni,
    estado_civil: cliente.estadoCivil || "N/A",
    
    // Ubicación Detallada
    domicilio_legal: `${cliente.direccion}, ${cliente.localidad}, ${cliente.provincia} (CP: ${cliente.cp})`,
    datos_contacto: `Tel: ${cliente.telefono} | Laboral: ${cliente.telLaboral} | Email: ${cliente.email}`,
    
    // Datos Bancarios de Desembolso
    banco_receptor: cliente.banco,
    cbu_alias: cliente.cbu,
    
    // Matriz Financiera y Tasas
    capital_neto: `$${financiero.montoSolicitado.toLocaleString()}`,
    gastos_otorgamiento_porc: `${entidad.configuracion.tasaOtorgamiento || 10}%`,
    seguro_vida_porc: `${entidad.configuracion.tasaSeguroVida || 1.5}%`,
    tna_nominal: `${financiero.tna}%`,
    cft_total: `${financiero.cft}%`,
    
    // Cláusulas de Mora
    interes_punitorio_diario: "0.12%",
    interes_moratorio_mensual: `${entidad.configuracion.tasaMoratoria || 3.5}%`,
    
    // Datos de Fondeadero
    fondeado_por: financiero.fondeadorNombre || entidad.nombre
  };
};
