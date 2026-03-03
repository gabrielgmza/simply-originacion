// lib/email/resend.ts
// Cliente centralizado Resend + templates HTML white-label por evento

const RESEND_API = "https://api.resend.com/emails";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type EventoEmail =
  | "CREDITO_APROBADO"
  | "CREDITO_LIQUIDADO"
  | "COBRO_EXITOSO"
  | "COBRO_RECHAZADO"
  | "CREDITO_EN_MORA"
  | "RENOVACION_DISPONIBLE"
  | "RESUMEN_DIARIO"
  | "ALERTA_MORA_CRITICA"
  | "BIENVENIDA_GERENTE";

export interface EnvioEmailInput {
  to:          string | string[];
  evento:      EventoEmail;
  datos:       Record<string, any>;
  entidad: {
    nombre:        string;
    colorPrimario: string;
    emailRemitente?: string;  // ej: "notificaciones@creditosdelsur.com"
  };
  apiKey:      string;  // API Key de Resend de la entidad (o la de Paysur como fallback)
}

export interface EnvioResult {
  ok:     boolean;
  id?:    string;
  error?: string;
}

// ── Envío ─────────────────────────────────────────────────────────────────────

export async function enviarEmail(input: EnvioEmailInput): Promise<EnvioResult> {
  try {
    const template = TEMPLATES[input.evento];
    if (!template) return { ok: false, error: `Evento no definido: ${input.evento}` };

    const from = input.entidad.emailRemitente
      ? `${input.entidad.nombre} <${input.entidad.emailRemitente}>`
      : `${input.entidad.nombre} <notificaciones@paysurfinanzas.com>`;

    const html = template.html(input.datos, input.entidad);
    const subject = template.subject(input.datos, input.entidad);

    const res = await fetch(RESEND_API, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${input.apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from,
        to:      Array.isArray(input.to) ? input.to : [input.to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` };
    return { ok: true, id: data.id };

  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Base HTML (layout white-label) ───────────────────────────────────────────

function base(color: string, nombreEntidad: string, contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Notificación</title></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;overflow:hidden;border:1px solid #1f1f1f;">
        <!-- Header -->
        <tr><td style="background:${color};padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">${nombreEntidad}</p>
        </td></tr>
        <!-- Cuerpo -->
        <tr><td style="padding:32px;">
          ${contenido}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #1f1f1f;">
          <p style="margin:0;color:#555;font-size:11px;">Este es un mensaje automático de ${nombreEntidad}. No respondas este email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// ── Templates por evento ──────────────────────────────────────────────────────

const TEMPLATES: Record<EventoEmail, {
  subject: (d: any, e: any) => string;
  html:    (d: any, e: any) => string;
}> = {

  CREDITO_APROBADO: {
    subject: (d) => `✅ Tu crédito fue aprobado — ${fmt(d.monto)}`,
    html: (d, e) => base(e.colorPrimario, e.nombre, `
      <p style="color:#aaa;font-size:13px;margin:0 0 8px;">Hola <strong style="color:#fff">${d.nombre}</strong>,</p>
      <p style="color:#fff;font-size:24px;font-weight:900;margin:0 0 24px;">Tu crédito fue aprobado 🎉</p>
      <div style="background:#0d0d0d;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;border-bottom:1px solid #1f1f1f;">
            <span style="color:#666;font-size:11px;text-transform:uppercase;">Monto aprobado</span><br>
            <span style="color:#fff;font-size:20px;font-weight:900;">${fmt(d.monto)}</span>
          </td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #1f1f1f;">
            <span style="color:#666;font-size:11px;text-transform:uppercase;">Plan</span><br>
            <span style="color:#fff;font-weight:700;">${d.cuotas} cuotas de ${fmt(d.valorCuota)}</span>
          </td></tr>
          <tr><td style="padding:8px 0;">
            <span style="color:#666;font-size:11px;text-transform:uppercase;">TNA</span><br>
            <span style="color:#fff;font-weight:700;">${d.tna}%</span>
          </td></tr>
        </table>
      </div>
      <p style="color:#888;font-size:13px;">En breve te informaremos cuando los fondos sean transferidos a tu cuenta.</p>
    `),
  },

  CREDITO_LIQUIDADO: {
    subject: (d) => `💰 Fondos acreditados — ${fmt(d.monto)}`,
    html: (d, e) => base(e.colorPrimario, e.nombre, `
      <p style="color:#aaa;font-size:13px;margin:0 0 8px;">Hola <strong style="color:#fff">${d.nombre}</strong>,</p>
      <p style="color:#fff;font-size:24px;font-weight:900;margin:0 0 24px;">¡Tus fondos fueron transferidos!</p>
      <div style="background:#0d0d0d;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;border-bottom:1px solid #1f1f1f;">
            <span style="color:#666;font-size:11px;text-transform:uppercase;">Monto transferido</span><br>
            <span style="color:#4ade80;font-size:22px;font-weight:900;">${fmt(d.monto)}</span>
          </td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #1f1f1f;">
            <span style="color:#666;font-size:11px;text-transform:uppercase;">CBU destino</span><br>
            <span style="color:#fff;font-weight:700;font-family:monospace;">****${String(d.cbu).slice(-4)}</span>
          </td></tr>
          <tr><td style="padding:8px 0;">
            <span style="color:#666;font-size:11px;text-transform:uppercase;">Referencia</span><br>
            <span style="color:#fff;font-family:monospace;">${d.operacionId?.slice(0,12).toUpperCase()}</span>
          </td></tr>
        </table>
      </div>
      <p style="color:#888;font-size:13px;">Podés verificar los fondos en tu cuenta bancaria en las próximas horas.</p>
    `),
  },

  COBRO_EXITOSO: {
    subject: (d) => `✅ Débito de cuota ${d.nroCuota} realizado — ${fmt(d.monto)}`,
    html: (d, e) => base(e.colorPrimario, e.nombre, `
      <p style="color:#aaa;font-size:13px;margin:0 0 8px;">Hola <strong style="color:#fff">${d.nombre}</strong>,</p>
      <p style="color:#fff;font-size:22px;font-weight:900;margin:0 0 24px;">Cuota debitada correctamente</p>
      <div style="background:#0d0d0d;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;border-bottom:1px solid #1f1f1f;">
            <span style="color:#666;font-size:11px;text-transform:uppercase;">Cuota</span><br>
            <span style="color:#fff;font-weight:700;">${d.nroCuota} de ${d.totalCuotas}</span>
          </td></tr>
          <tr><td style="padding:8px 0;">
            <span style="color:#666;font-size:11px;text-transform:uppercase;">Monto debitado</span><br>
            <span style="color:#4ade80;font-size:20px;font-weight:900;">${fmt(d.monto)}</span>
          </td></tr>
        </table>
      </div>
      ${d.nroCuota === d.totalCuotas
        ? `<p style="color:#4ade80;font-weight:700;font-size:14px;">🎉 ¡Crédito cancelado! Gracias por tu puntualidad.</p>`
        : `<p style="color:#888;font-size:13px;">Te quedan ${d.totalCuotas - d.nroCuota} cuotas.</p>`}
    `),
  },

  COBRO_RECHAZADO: {
    subject: (d) => `⚠️ No pudimos debitar tu cuota ${d.nroCuota}`,
    html: (d, e) => base(e.colorPrimario, e.nombre, `
      <p style="color:#aaa;font-size:13px;margin:0 0 8px;">Hola <strong style="color:#fff">${d.nombre}</strong>,</p>
      <p style="color:#fff;font-size:22px;font-weight:900;margin:0 0 24px;">⚠️ Cobro rechazado</p>
      <div style="background:#1a0a0a;border:1px solid #3d1515;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#f87171;margin:0 0 8px;font-weight:700;">Cuota ${d.nroCuota} — ${fmt(d.monto)}</p>
        <p style="color:#888;font-size:13px;margin:0;">Motivo: ${d.motivo || "Fondos insuficientes"}</p>
      </div>
      ${d.fechaReintento
        ? `<p style="color:#aaa;font-size:13px;">Reintentaremos el cobro el <strong style="color:#fff">${d.fechaReintento}</strong>. Asegurate de tener fondos disponibles.</p>`
        : `<p style="color:#f87171;font-size:13px;font-weight:700;">Tu crédito entró en mora. Comunicate con nosotros para regularizar.</p>`}
    `),
  },

  CREDITO_EN_MORA: {
    subject: (d) => `🔴 Tu crédito entró en mora — acción requerida`,
    html: (d, e) => base(e.colorPrimario, e.nombre, `
      <p style="color:#aaa;font-size:13px;margin:0 0 8px;">Hola <strong style="color:#fff">${d.nombre}</strong>,</p>
      <p style="color:#f87171;font-size:22px;font-weight:900;margin:0 0 24px;">Tu crédito está en mora</p>
      <div style="background:#1a0a0a;border:1px solid #3d1515;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;border-bottom:1px solid #2d1010;">
            <span style="color:#666;font-size:11px;">DEUDA ACTUAL</span><br>
            <span style="color:#f87171;font-size:20px;font-weight:900;">${fmt(d.deuda)}</span>
          </td></tr>
          <tr><td style="padding:8px 0;">
            <span style="color:#666;font-size:11px;">DÍAS EN MORA</span><br>
            <span style="color:#fff;font-weight:700;">${d.diasMora} días</span>
          </td></tr>
        </table>
      </div>
      <p style="color:#aaa;font-size:13px;">Por favor comunicate con nosotros para regularizar tu situación y evitar recargos adicionales.</p>
    `),
  },

  RENOVACION_DISPONIBLE: {
    subject: () => `🔄 ¡Podés renovar tu crédito!`,
    html: (d, e) => base(e.colorPrimario, e.nombre, `
      <p style="color:#aaa;font-size:13px;margin:0 0 8px;">Hola <strong style="color:#fff">${d.nombre}</strong>,</p>
      <p style="color:#fff;font-size:22px;font-weight:900;margin:0 0 16px;">¡Tenés una renovación disponible!</p>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">Dado tu buen historial de pagos, podés renovar tu crédito por un monto mayor.</p>
      <div style="background:#0d0d0d;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#666;font-size:11px;margin:0 0 4px;text-transform:uppercase;">Crédito actual</p>
        <p style="color:#fff;font-weight:900;font-size:18px;margin:0 0 12px;">${fmt(d.montoActual)}</p>
        <p style="color:#666;font-size:11px;margin:0 0 4px;text-transform:uppercase;">Cuotas pagadas</p>
        <p style="color:#fff;font-weight:700;margin:0;">${d.cuotasPagadas} de ${d.totalCuotas}</p>
      </div>
      <p style="color:#aaa;font-size:13px;">Comunicate con tu asesor o ingresá al portal para iniciar la renovación.</p>
    `),
  },

  RESUMEN_DIARIO: {
    subject: (d, e) => `📊 Resumen del día — ${e.nombre} — ${d.fecha}`,
    html: (d, e) => base(e.colorPrimario, e.nombre, `
      <p style="color:#fff;font-size:20px;font-weight:900;margin:0 0 24px;">Resumen operativo del día</p>
      <p style="color:#666;font-size:12px;margin:0 0 16px;">${d.fecha}</p>
      <div style="display:grid;gap:12px;margin-bottom:24px;">
        ${[
          { label: "Operaciones nuevas",    valor: d.operacionesNuevas,          color: "#60a5fa" },
          { label: "Créditos liquidados",   valor: d.liquidados,                  color: "#4ade80" },
          { label: "Monto total liquidado", valor: fmt(d.montoLiquidado),         color: "#4ade80" },
          { label: "Cobros exitosos",       valor: d.cobrosExitosos,              color: "#4ade80" },
          { label: "Cobros rechazados",     valor: d.cobrosRechazados,            color: "#f87171" },
          { label: "Operaciones en mora",   valor: d.enMora,                      color: "#fb923c" },
        ].map(k => `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-radius:10px;padding:14px;">
            <tr>
              <td><span style="color:#666;font-size:11px;text-transform:uppercase;">${k.label}</span></td>
              <td align="right"><span style="color:${k.color};font-weight:900;font-size:16px;">${k.valor}</span></td>
            </tr>
          </table>
        `).join("")}
      </div>
    `),
  },

  ALERTA_MORA_CRITICA: {
    subject: (d) => `🚨 Alerta: ${d.cantidad} créditos en mora crítica`,
    html: (d, e) => base(e.colorPrimario, e.nombre, `
      <p style="color:#f87171;font-size:20px;font-weight:900;margin:0 0 16px;">🚨 Alerta de mora crítica</p>
      <p style="color:#aaa;font-size:14px;margin:0 0 24px;">${d.cantidad} crédito(s) llevan más de ${d.diasMora} días en mora.</p>
      <div style="background:#1a0a0a;border:1px solid #3d1515;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr style="border-bottom:1px solid #2d1010;">
            <td style="padding:8px 0;color:#666;font-size:11px;">CLIENTE</td>
            <td style="padding:8px 0;color:#666;font-size:11px;">DEUDA</td>
            <td style="padding:8px 0;color:#666;font-size:11px;">DÍAS</td>
          </tr>
          ${(d.casos || []).slice(0, 10).map((c: any) => `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #1a0a0a;color:#fff;font-size:13px;">${c.nombre}</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a0a0a;color:#f87171;font-weight:700;font-size:13px;">${fmt(c.deuda)}</td>
              <td style="padding:8px 0;border-bottom:1px solid #1a0a0a;color:#fb923c;font-size:13px;">${c.dias}d</td>
            </tr>
          `).join("")}
        </table>
      </div>
      <p style="color:#888;font-size:12px;">Ingresá al módulo de cobranzas para gestionar estos casos.</p>
    `),
  },

  BIENVENIDA_GERENTE: {
    subject: (d, e) => `Bienvenido a ${e.nombre} — tus credenciales de acceso`,
    html: (d, e) => base(e.colorPrimario, e.nombre, `
      <p style="color:#aaa;font-size:13px;margin:0 0 8px;">Hola <strong style="color:#fff">${d.nombre}</strong>,</p>
      <p style="color:#fff;font-size:22px;font-weight:900;margin:0 0 16px;">Bienvenido a la plataforma</p>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">Fuiste designado como GERENTE GENERAL de <strong style="color:#fff">${e.nombre}</strong>. A continuación tus credenciales para completar la configuración inicial:</p>
      <div style="background:#0d0d0d;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#666;font-size:11px;margin:0 0 4px;text-transform:uppercase;">Email</p>
        <p style="color:#fff;font-weight:700;margin:0 0 16px;font-family:monospace;">${d.email}</p>
        <p style="color:#666;font-size:11px;margin:0 0 4px;text-transform:uppercase;">Contraseña temporal</p>
        <p style="color:#fff;font-weight:700;margin:0;font-family:monospace;">${d.password}</p>
      </div>
      <p style="color:#888;font-size:13px;margin:0 0 8px;">Usá este link para completar la configuración:</p>
      <a href="${d.linkSetup}" style="display:inline-block;background:${e.colorPrimario};color:#fff;font-weight:900;padding:12px 24px;border-radius:10px;text-decoration:none;">Completar setup →</a>
      <p style="color:#555;font-size:11px;margin-top:16px;">Por seguridad, cambiá tu contraseña al ingresar por primera vez.</p>
    `),
  },
};
