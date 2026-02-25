export const generarLinkCobro = async (monto: number, entidadConfig: any) => {
  // El sistema elige la pasarela configurada por la entidad
  if (entidadConfig.pagos360Key) {
    console.log("Generando link vía Pagos360 con credenciales propias...");
    // Lógica de API de Pagos360
  } else if (entidadConfig.mercadoPagoToken) {
    console.log("Generando link vía MercadoPago con credenciales propias...");
    // Lógica de API de MercadoPago
  }
  return { url: "https://link-de-pago.com/..." };
};
