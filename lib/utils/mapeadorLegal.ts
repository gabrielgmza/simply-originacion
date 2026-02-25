export const mapearDatosParaPDF = (operacion: any, entidad: any) => {
  const c = operacion.cliente;
  const f = operacion.financiero;
  
  return {
    // Datos Personales Atómicos
    "{{CLIENTE_NOMBRE_COMPLETO}}": `${c.primerNombre} ${c.segundoNombre || ''} ${c.apellidoPaterno} ${c.apellidoMaterno || ''}`,
    "{{CLIENTE_DNI}}": c.dni,
    "{{CLIENTE_CUIL}}": c.cuil,
    "{{CLIENTE_DOMICILIO}}": `${c.domicilio}, ${c.localidad}, ${c.provincia} (CP: ${c.codigoPostal})`,
    "{{CLIENTE_TELEFONO}}": c.telefono,
    "{{CLIENTE_EMAIL}}": c.email,
    
    // Datos Bancarios
    "{{BANCO_NOMBRE}}": c.banco,
    "{{BANCO_CBU}}": c.cbu,
    "{{BANCO_ALIAS}}": c.alias,
    
    // Datos Financieros de Precisión
    "{{CREDITO_MONTO_BRUTO}}": `$${f.montoBruto.toLocaleString('es-AR')}`,
    "{{CREDITO_MONTO_NETO}}": `$${f.montoNeto.toLocaleString('es-AR')}`,
    "{{CREDITO_CUOTAS}}": f.cuotas,
    "{{CREDITO_VALOR_CUOTA}}": `$${f.valorCuota.toLocaleString('es-AR')}`,
    "{{CREDITO_TNA}}": `${f.tna}%`,
    "{{CREDITO_CFT}}": `${f.cft}%`,
    "{{CREDITO_GASTOS_OTORG}}": `$${f.gastosOtorgamiento.toLocaleString('es-AR')}`,
    "{{FONDEADOR_NOMBRE}}": f.fondeadorNombre || "Capital Propio",
    
    // Entidad
    "{{ENTIDAD_NOMBRE}}": entidad.nombre,
    "{{FECHA_SISTEMA}}": new Date().toLocaleDateString('es-AR')
  };
};
