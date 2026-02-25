export const evaluarPerfilDinamico = (datosScraping: any, politicaEntidad: any) => {
  let estado = "APROBADO";
  let color = "bg-green-600";
  let motivos = [];

  // 1. REGLA BCRA
  const situacionCliente = datosScraping.bcra?.peorSituacion || 1;
  if (situacionCliente > politicaEntidad.bcraMaximoPermitido) {
    estado = politicaEntidad.accionBcraExcedido; // Puede ser "RECHAZADO" o "OBSERVADO"
    color = estado === "RECHAZADO" ? "bg-red-600" : "bg-yellow-600";
    motivos.push(`Situación BCRA (${situacionCliente}) supera el límite de la entidad (${politicaEntidad.bcraMaximoPermitido}).`);
  }

  // 2. REGLA JUDICIAL (Mendoza)
  if (datosScraping.judicial?.tieneRegistros && politicaEntidad.rechazarQuiebrasVigentes) {
    estado = "RECHAZADO";
    color = "bg-red-600";
    motivos.push("Rechazo automático por política: Posee procesos de Quiebra/Concurso vigentes.");
  }

  // 3. REGLA EMPLEO Y CUPO (El enchufe para NOSIS / API Provincial)
  // Si la política exige ser empleado público y la API dice que no lo es:
  if (politicaEntidad.exigeEmpleadoPublico && datosScraping.empleo?.esEmpleadoPublico === false) {
    estado = "RECHAZADO";
    color = "bg-red-600";
    motivos.push("La política exige que el titular sea Empleado Público.");
  }

  // 4. VERIFICACIÓN DE CUPO
  if (datosScraping.empleo?.cupoDisponible < politicaEntidad.cupoMinimoRequerido) {
    estado = "RECHAZADO";
    color = "bg-red-600";
    motivos.push(`El cupo disponible ($${datosScraping.empleo?.cupoDisponible}) es menor al mínimo exigido.`);
  }

  if (motivos.length === 0) {
    motivos.push("El perfil cumple con el 100% de los criterios de la entidad.");
  }

  return { estado, color, motivos };
};
