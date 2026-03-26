// lib/legal/variables.ts
// Catálogo de variables disponibles para plantillas legales
// Las entidades usan estas variables en sus DOCX/PDF: {{cliente.nombre}}, {{financiero.monto}}, etc.

export interface VariableInfo {
  key:         string;   // ej: "cliente.nombre"
  label:       string;   // ej: "Nombre completo"
  categoria:   string;   // ej: "Cliente"
  ejemplo:     string;   // ej: "PAREDES PAMELA ERIKA"
}

export const VARIABLES_DISPONIBLES: VariableInfo[] = [
  // ── Cliente ──
  { key: "cliente.nombre",     label: "Nombre completo",        categoria: "Cliente",     ejemplo: "PAREDES PAMELA ERIKA" },
  { key: "cliente.dni",        label: "DNI",                    categoria: "Cliente",     ejemplo: "35616517" },
  { key: "cliente.cuil",       label: "CUIL",                   categoria: "Cliente",     ejemplo: "27-35616517-4" },
  { key: "cliente.domicilio",  label: "Domicilio",              categoria: "Cliente",     ejemplo: "Av. San Martín 1234, Mendoza" },
  { key: "cliente.telefono",   label: "Teléfono",               categoria: "Cliente",     ejemplo: "2614567890" },
  { key: "cliente.email",      label: "Email",                  categoria: "Cliente",     ejemplo: "cliente@email.com" },
  { key: "cliente.cbu",        label: "CBU",                    categoria: "Cliente",     ejemplo: "0720000488000012345678" },
  { key: "cliente.banco",      label: "Banco",                  categoria: "Cliente",     ejemplo: "Banco Santander" },

  // ── Financiero ──
  { key: "financiero.monto",          label: "Monto solicitado ($)",       categoria: "Financiero", ejemplo: "$150.000" },
  { key: "financiero.montoLetras",    label: "Monto en letras",            categoria: "Financiero", ejemplo: "CIENTO CINCUENTA MIL PESOS" },
  { key: "financiero.cuotas",         label: "Cantidad de cuotas",         categoria: "Financiero", ejemplo: "12" },
  { key: "financiero.valorCuota",     label: "Valor de la cuota ($)",      categoria: "Financiero", ejemplo: "$18.500" },
  { key: "financiero.tna",            label: "TNA (%)",                    categoria: "Financiero", ejemplo: "80%" },
  { key: "financiero.cft",            label: "CFT (%)",                    categoria: "Financiero", ejemplo: "125.4%" },
  { key: "financiero.totalDevolver",  label: "Total a devolver ($)",       categoria: "Financiero", ejemplo: "$222.000" },
  { key: "financiero.primerVto",      label: "Fecha primer vencimiento",   categoria: "Financiero", ejemplo: "15/05/2026" },
  { key: "financiero.ultimoVto",      label: "Fecha último vencimiento",   categoria: "Financiero", ejemplo: "15/04/2027" },

  // ── Operación ──
  { key: "operacion.id",           label: "ID de operación",       categoria: "Operación",  ejemplo: "OP-A1B2C3D4" },
  { key: "operacion.tipo",         label: "Tipo de producto",      categoria: "Operación",  ejemplo: "CUAD" },
  { key: "operacion.fecha",        label: "Fecha de la operación", categoria: "Operación",  ejemplo: "25/03/2026" },
  { key: "operacion.estado",       label: "Estado actual",         categoria: "Operación",  ejemplo: "LIQUIDADO" },
  { key: "operacion.vendedor",     label: "Vendedor",              categoria: "Operación",  ejemplo: "Juan Pérez" },

  // ── Entidad ──
  { key: "entidad.nombre",        label: "Nombre de la entidad",   categoria: "Entidad",    ejemplo: "CrediCroto S.A." },
  { key: "entidad.razonSocial",   label: "Razón social",           categoria: "Entidad",    ejemplo: "CrediCroto Sociedad Anónima" },
  { key: "entidad.cuit",          label: "CUIT de la entidad",     categoria: "Entidad",    ejemplo: "30-71234567-8" },
  { key: "entidad.domicilio",     label: "Domicilio legal",        categoria: "Entidad",    ejemplo: "Av. España 456, Mendoza" },

  // ── Fondeador ──
  { key: "fondeador.nombre",     label: "Nombre del fondeador",    categoria: "Fondeador",  ejemplo: "FCI Inversiones" },
  { key: "fondeador.tna",        label: "TNA del fondeador (%)",   categoria: "Fondeador",  ejemplo: "75%" },

  // ── Fecha ──
  { key: "fecha.hoy",            label: "Fecha actual",            categoria: "Fecha",      ejemplo: "25 de marzo de 2026" },
  { key: "fecha.hoyCorta",       label: "Fecha actual (corta)",    categoria: "Fecha",      ejemplo: "25/03/2026" },
  { key: "fecha.lugar",          label: "Lugar y fecha",           categoria: "Fecha",      ejemplo: "Mendoza, 25 de marzo de 2026" },
];

// Categorías para agrupar en la UI
export const CATEGORIAS = [...new Set(VARIABLES_DISPONIBLES.map(v => v.categoria))];

// Función para resolver una variable desde los datos de la operación
export function resolverVariable(key: string, datos: {
  operacion: any;
  entidad: any;
  vendedor?: string;
}): string {
  const { operacion: op, entidad: ent, vendedor } = datos;
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
  const hoy = new Date();

  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  const map: Record<string, string> = {
    "cliente.nombre":      op.cliente?.nombre || "",
    "cliente.dni":         op.cliente?.dni || "",
    "cliente.cuil":        formatCuil(op.cliente?.cuil || ""),
    "cliente.domicilio":   op.cliente?.domicilio || "",
    "cliente.telefono":    op.cliente?.telefono || "",
    "cliente.email":       op.cliente?.email || "",
    "cliente.cbu":         op.cliente?.cbu || "",
    "cliente.banco":       op.cliente?.banco || "",

    "financiero.monto":         fmt(op.financiero?.montoSolicitado || 0),
    "financiero.montoLetras":   numeroALetras(op.financiero?.montoSolicitado || 0),
    "financiero.cuotas":        String(op.financiero?.cuotas || 0),
    "financiero.valorCuota":    fmt(op.financiero?.valorCuota || 0),
    "financiero.tna":           (op.financiero?.tna || op.fondeo?.tna || 0) + "%",
    "financiero.cft":           (op.financiero?.cft || 0) + "%",
    "financiero.totalDevolver": fmt((op.financiero?.valorCuota || 0) * (op.financiero?.cuotas || 0)),
    "financiero.primerVto":     calcularVencimiento(hoy, 1),
    "financiero.ultimoVto":     calcularVencimiento(hoy, op.financiero?.cuotas || 12),

    "operacion.id":        op.id?.slice(0, 8).toUpperCase() || "",
    "operacion.tipo":      op.tipo || "",
    "operacion.fecha":     hoy.toLocaleDateString("es-AR"),
    "operacion.estado":    op.estado || "",
    "operacion.vendedor":  vendedor || "",

    "entidad.nombre":       ent?.nombreFantasia || "",
    "entidad.razonSocial":  ent?.razonSocial || "",
    "entidad.cuit":         ent?.cuit || "",
    "entidad.domicilio":    ent?.contacto?.domicilio || ent?.domicilio || "",

    "fondeador.nombre":    op.fondeo?.nombre || "Capital Propio",
    "fondeador.tna":       (op.fondeo?.tna || 0) + "%",

    "fecha.hoy":           `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`,
    "fecha.hoyCorta":      hoy.toLocaleDateString("es-AR"),
    "fecha.lugar":         `Mendoza, ${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`,
  };

  return map[key] ?? `{{${key}}}`;
}

// Reemplazar todas las variables en un texto
export function reemplazarVariables(texto: string, datos: {
  operacion: any;
  entidad: any;
  vendedor?: string;
}): string {
  return texto.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    return resolverVariable(key.trim(), datos);
  });
}

// Helpers
function formatCuil(cuil: string): string {
  if (cuil.length !== 11) return cuil;
  return `${cuil.slice(0, 2)}-${cuil.slice(2, 10)}-${cuil.slice(10)}`;
}

function calcularVencimiento(desde: Date, cuotaNum: number): string {
  const fecha = new Date(desde);
  fecha.setMonth(fecha.getMonth() + cuotaNum);
  fecha.setDate(15); // vencimiento el 15 de cada mes
  return fecha.toLocaleDateString("es-AR");
}

function numeroALetras(n: number): string {
  if (n === 0) return "CERO PESOS";
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales: Record<number, string> = {
    11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
    16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
    21: "VEINTIUN", 22: "VEINTIDOS", 23: "VEINTITRES", 24: "VEINTICUATRO",
    25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE",
  };

  const convertir = (num: number): string => {
    if (num === 0) return "";
    if (num < 10) return unidades[num];
    if (especiales[num]) return especiales[num];
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      return u === 0 ? decenas[d] : `${decenas[d]} Y ${unidades[u]}`;
    }
    if (num === 100) return "CIEN";
    if (num < 1000) {
      const c = Math.floor(num / 100);
      const resto = num % 100;
      const prefix = c === 1 ? "CIENTO" : unidades[c] + (c === 5 ? "IENTOS" : "CIENTOS");
      return resto === 0 ? prefix : `${prefix} ${convertir(resto)}`;
    }
    if (num < 1000000) {
      const miles = Math.floor(num / 1000);
      const resto = num % 1000;
      const prefix = miles === 1 ? "MIL" : `${convertir(miles)} MIL`;
      return resto === 0 ? prefix : `${prefix} ${convertir(resto)}`;
    }
    const millones = Math.floor(num / 1000000);
    const resto = num % 1000000;
    const prefix = millones === 1 ? "UN MILLON" : `${convertir(millones)} MILLONES`;
    return resto === 0 ? prefix : `${prefix} ${convertir(resto)}`;
  };

  return convertir(Math.round(n)) + " PESOS";
}
