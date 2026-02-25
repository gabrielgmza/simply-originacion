export const generarCodigoOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const enviarSMS = async (telefono: string, codigo: string) => {
  console.log(`[SIMULADOR SMS] Enviando código ${codigo} a ${telefono}`);
  return { success: true };
};
