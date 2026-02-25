export interface Fondeador {
  id: string;
  nombre: string;
  tasaNominalAnual: number;
  plazoMaximo: number;
  documentacionRequerida: string[]; // ej: ["DNI", "Recibo de Sueldo", "Servicio"]
  comisionSimplyVariable: number; // Tu comisión por este fondeadero
}

export const vincularOperacionAFondeo = (operacionId: string, fondeadorId: string) => {
  // Lógica para asignar el crédito al fondeadero
  return { operacionId, fondeadorId, estado: 'PENDIENTE_FONDEO' };
};
