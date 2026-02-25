export const validarFormatoContacto = (email: string, telefono: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const telRegex = /^\+?[1-9]\d{1,14}$/; // Formato E.164
  
  return {
    emailValido: emailRegex.test(email),
    telValido: telRegex.test(telefono)
  };
};

export const generarTokenVerificacion = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
