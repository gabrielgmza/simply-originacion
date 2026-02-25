export async function enviarNotificacionLiquidacion(operacion: any) {
  const { cliente, financiero } = operacion;
  
  const mensaje = `¡Hola ${cliente.primerNombre}! Te informamos que tu crédito ha sido liquidado con éxito. 
  Monto transferido: $${financiero.montoNeto.toLocaleString('es-AR')}
  CBU destino: ****${cliente.cbu.slice(-4)}
  Entidad: ${operacion.entidadNombre}
  
  Ya puedes verificar los fondos en tu cuenta bancaria.`;

  try {
    // Aquí conectaríamos con tu proveedor de WhatsApp (ej: Twilio, Wati, o un Webhook propio)
    console.log("Enviando notificación:", mensaje);
    
    // Simulación de envío exitoso
    return { success: true, timestamp: new Date() };
  } catch (error) {
    console.error("Error al enviar notificación:", error);
    return { success: false, error };
  }
}
