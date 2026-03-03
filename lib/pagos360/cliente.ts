// lib/pagos360/cliente.ts
// Wrapper centralizado para la API de Pagos 360
// Docs: https://developers.pagos360.com

const BASE_URL = "https://api.pagos360.com";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface P360AdhesionInput {
  cbu:            string;
  email:          string;
  nombre:         string;
  cuit:           string;
  descripcion?:   string;   // ej: "Crédito #OP-12345"
  external_id?:   string;   // nuestro operacionId
}

export interface P360CobroInput {
  adhesion_uid:   string;   // uid devuelto al adherir
  monto:          number;   // en pesos, sin centavos
  descripcion:    string;
  fecha_primer_cobro?: string;  // ISO date YYYY-MM-DD
  external_id?:   string;
}

export interface P360Response {
  ok:       boolean;
  data?:    any;
  error?:   string;
  status?:  number;
}

// ── Helper de fetch ───────────────────────────────────────────────────────────

async function p360Fetch(
  endpoint:  string,
  method:    "GET" | "POST" | "DELETE",
  apiKey:    string,
  body?:     object
): Promise<P360Response> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok:     false,
        error:  data?.message || data?.error || `HTTP ${res.status}`,
        status: res.status,
        data,
      };
    }
    return { ok: true, data, status: res.status };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Adhesión de CBU ──────────────────────────────────────────────────────────

/**
 * Adhiere un CBU al sistema Pagos 360.
 * Devuelve el uid de adhesión que se guarda en la operación.
 */
export async function adherirCbu(
  apiKey: string,
  input:  P360AdhesionInput
): Promise<P360Response> {
  return p360Fetch("/adhesion", "POST", apiKey, {
    cbu:          input.cbu,
    email:        input.email,
    holder_name:  input.nombre,
    cuit:         input.cuit.replace(/\D/g, ""),
    description:  input.descripcion || "Crédito Paysur Finanzas",
    external_id:  input.external_id,
  });
}

/**
 * Consulta el estado de una adhesión existente.
 */
export async function consultarAdhesion(
  apiKey:       string,
  adhesionUid:  string
): Promise<P360Response> {
  return p360Fetch(`/adhesion/${adhesionUid}`, "GET", apiKey);
}

/**
 * Cancela una adhesión (cuando se cancela el crédito).
 */
export async function cancelarAdhesion(
  apiKey:       string,
  adhesionUid:  string
): Promise<P360Response> {
  return p360Fetch(`/adhesion/${adhesionUid}`, "DELETE", apiKey);
}

// ── Cobros ───────────────────────────────────────────────────────────────────

/**
 * Inicia un cobro sobre una adhesión existente.
 */
export async function iniciarCobro(
  apiKey: string,
  input:  P360CobroInput
): Promise<P360Response> {
  return p360Fetch("/payment-request", "POST", apiKey, {
    adhesion_uid:      input.adhesion_uid,
    amount:            input.monto,
    description:       input.descripcion,
    first_due_date:    input.fecha_primer_cobro || new Date().toISOString().slice(0, 10),
    first_total:       input.monto,
    external_reference:input.external_id,
  });
}

/**
 * Consulta el estado de un cobro.
 */
export async function consultarCobro(
  apiKey:    string,
  requestId: string
): Promise<P360Response> {
  return p360Fetch(`/payment-request/${requestId}`, "GET", apiKey);
}
