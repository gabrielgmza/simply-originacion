// lib/revision/motor-fraude.ts
// Motor híbrido de validación de onboarding
// Capa 1: validaciones locales (siempre, gratis)
// Capa 2: Google Cloud Vision (opcional, por entidad)

export interface ReglasRevision {
  // Validaciones automáticas (motor local)
  validarImagenesPresentes:   boolean;
  validarLiveness:            boolean;
  validarGeolocacion:         boolean;
  validarFirmaPresente:       boolean;
  validarCamposExtraCompletos:boolean;

  // Validaciones con Vision API
  visionActivo:               boolean;
  visionOcrDni:               boolean; // extraer y comparar datos del DNI
  visionDetectarFotocopia:    boolean; // detectar si el DNI es una copia de pantalla
  visionCompararRostros:      boolean; // comparar selfie vs foto DNI

  // Umbrales
  umbralAutoAprobacion: number; // % checks ok para aprobación automática (ej: 90)
  umbralAutoRechazo:    number; // % checks ok por debajo del cual rechaza auto (ej: 40)
}

export const REGLAS_DEFAULT: ReglasRevision = {
  validarImagenesPresentes:    true,
  validarLiveness:             true,
  validarGeolocacion:          false,
  validarFirmaPresente:        true,
  validarCamposExtraCompletos: true,
  visionActivo:                false,
  visionOcrDni:                false,
  visionDetectarFotocopia:     false,
  visionCompararRostros:       false,
  umbralAutoAprobacion:        90,
  umbralAutoRechazo:           30,
};

export type EstadoCheck = "OK" | "FALLA" | "MANUAL" | "OMITIDO";

export interface CheckResult {
  id:          string;
  nombre:      string;
  descripcion: string;
  estado:      EstadoCheck;
  detalle:     string;
  esAutomatico:boolean;
  peso:        number; // para calcular score
}

export interface ResultadoRevision {
  checks:          CheckResult[];
  scoreValidacion: number;       // 0-100
  decision:        "APROBADO_AUTO" | "REVISION_MANUAL" | "RECHAZADO_AUTO";
  requiereManual:  boolean;
  resumen:         string;
  ocrDatos?:       OcrDatos;     // solo si Vision está activo
}

export interface OcrDatos {
  nombreExtraido?:  string;
  dniExtraido?:     string;
  fechaNacExtraida?:string;
  coincideConLegajo:boolean;
  discrepancias:    string[];
}

// ── Motor local ───────────────────────────────────────────────────────────────
export function validarLocal(
  op: any,
  reglas: Partial<ReglasRevision> = {}
): CheckResult[] {
  const cfg = { ...REGLAS_DEFAULT, ...reglas };
  const checks: CheckResult[] = [];
  const legajo = op.legajo || {};
  const seguridad = op.seguridad || {};
  const camposExtra = legajo.camposExtra || {};
  const camposExtraConfig: any[] = op._camposExtraConfig || [];

  // 1. DNI frente
  if (cfg.validarImagenesPresentes) {
    checks.push({
      id:           "dni_frente",
      nombre:       "DNI frente",
      descripcion:  "Imagen del frente del DNI capturada",
      estado:       legajo.dniFrenteUrl ? "OK" : "FALLA",
      detalle:      legajo.dniFrenteUrl ? "Imagen presente" : "No se recibió imagen del DNI frente",
      esAutomatico: true,
      peso:         15,
    });

    // 2. DNI dorso
    checks.push({
      id:           "dni_dorso",
      nombre:       "DNI dorso",
      descripcion:  "Imagen del dorso del DNI capturada",
      estado:       legajo.dniDorsoUrl ? "OK" : "FALLA",
      detalle:      legajo.dniDorsoUrl ? "Imagen presente" : "No se recibió imagen del DNI dorso",
      esAutomatico: true,
      peso:         10,
    });

    // 3. Selfie
    checks.push({
      id:           "selfie",
      nombre:       "Selfie",
      descripcion:  "Fotografía del titular capturada",
      estado:       legajo.selfieUrl ? "OK" : "FALLA",
      detalle:      legajo.selfieUrl ? "Imagen presente" : "No se recibió selfie del titular",
      esAutomatico: true,
      peso:         15,
    });
  }

  // 4. Firma
  if (cfg.validarFirmaPresente) {
    checks.push({
      id:           "firma",
      nombre:       "Firma digital",
      descripcion:  "Firma manuscrita del titular",
      estado:       legajo.firmaUrl ? "OK" : "FALLA",
      detalle:      legajo.firmaUrl ? "Firma registrada" : "No se recibió firma digital",
      esAutomatico: true,
      peso:         20,
    });
  }

  // 5. Liveness
  if (cfg.validarLiveness) {
    checks.push({
      id:           "liveness",
      nombre:       "Detección de vida",
      descripcion:  "Verificación de que el selfie corresponde a una persona real",
      estado:       seguridad.livenessAprobado ? "OK" : "FALLA",
      detalle:      seguridad.livenessAprobado
                      ? "Liveness aprobado durante el onboarding"
                      : "No se aprobó la detección de movimiento",
      esAutomatico: true,
      peso:         20,
    });
  }

  // 6. Geolocalización
  if (cfg.validarGeolocacion) {
    const tieneGeo = !!seguridad.geolocacion?.lat;
    checks.push({
      id:           "geolocacion",
      nombre:       "Geolocalización",
      descripcion:  "Ubicación del cliente al momento del onboarding",
      estado:       tieneGeo ? "OK" : "MANUAL",
      detalle:      tieneGeo
                      ? `Lat ${seguridad.geolocacion.lat.toFixed(4)}, Lng ${seguridad.geolocacion.lng.toFixed(4)}`
                      : "El cliente no habilitó la ubicación — requiere revisión manual",
      esAutomatico: true,
      peso:         5,
    });
  }

  // 7. Campos extra obligatorios
  if (cfg.validarCamposExtraCompletos && camposExtraConfig.length > 0) {
    const faltantes = camposExtraConfig
      .filter((c: any) => c.requerido && !camposExtra[c.id])
      .map((c: any) => c.label);

    checks.push({
      id:           "campos_extra",
      nombre:       "Campos adicionales",
      descripcion:  "Campos personalizados requeridos por la entidad",
      estado:       faltantes.length === 0 ? "OK" : "FALLA",
      detalle:      faltantes.length === 0
                      ? "Todos los campos requeridos completados"
                      : `Faltan: ${faltantes.join(", ")}`,
      esAutomatico: true,
      peso:         10,
    });
  }

  // 8. Consistencia básica de datos (nombre / DNI en legajo vs operación)
  const nombreOp = op.cliente?.nombre || "";
  const dniOp    = op.cliente?.dni    || "";
  checks.push({
    id:           "datos_consistentes",
    nombre:       "Consistencia de datos",
    descripcion:  "Nombre y DNI del solicitante presentes en el legajo",
    estado:       (nombreOp && dniOp) ? "OK" : "FALLA",
    detalle:      (nombreOp && dniOp)
                    ? `${nombreOp} — DNI ${dniOp}`
                    : "Faltan nombre o DNI en el legajo de la operación",
    esAutomatico: true,
    peso:         5,
  });

  return checks;
}

// ── Google Cloud Vision ────────────────────────────────────────────────────────
export async function validarConVision(
  op: any,
  googleVisionApiKey: string,
  reglas: Partial<ReglasRevision> = {}
): Promise<{ checks: CheckResult[]; ocrDatos?: OcrDatos }> {
  const cfg = { ...REGLAS_DEFAULT, ...reglas };
  const checks: CheckResult[] = [];
  const legajo = op.legajo || {};
  let ocrDatos: OcrDatos | undefined;

  // Helper: llamar a Vision API con una imagen URL
  const callVision = async (imageUrl: string, features: any[]) => {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image:    { source: { imageUri: imageUrl } },
            features,
          }],
        }),
      }
    );
    return res.json();
  };

  // ── OCR en DNI frente ──────────────────────────────────────────────────────
  if (cfg.visionOcrDni && legajo.dniFrenteUrl) {
    try {
      const visionRes = await callVision(legajo.dniFrenteUrl, [
        { type: "TEXT_DETECTION" },
        { type: "SAFE_SEARCH_DETECTION" },
      ]);

      const texto      = visionRes.responses?.[0]?.fullTextAnnotation?.text || "";
      const safeSearch = visionRes.responses?.[0]?.safeSearchAnnotation || {};

      // Extraer datos básicos del texto del DNI
      const dniEnTexto    = texto.match(/\b\d{7,8}\b/)?.[0]  || "";
      const nombreEnTexto = extraerNombreDni(texto);

      // Detectar si es fotocopia/pantalla
      const esFotocopia = ["LIKELY","VERY_LIKELY"].includes(safeSearch.spoof || "");

      // Comparar con legajo
      const discrepancias: string[] = [];
      if (dniEnTexto && dniEnTexto !== (op.cliente?.dni || "").replace(/\./g, ""))
        discrepancias.push(`DNI en imagen (${dniEnTexto}) ≠ DNI en legajo (${op.cliente?.dni})`);

      ocrDatos = {
        nombreExtraido:   nombreEnTexto || undefined,
        dniExtraido:      dniEnTexto    || undefined,
        coincideConLegajo:discrepancias.length === 0,
        discrepancias,
      };

      checks.push({
        id:           "ocr_dni",
        nombre:       "OCR — Lectura DNI",
        descripcion:  "Extracción y verificación de datos del DNI físico",
        estado:       discrepancias.length === 0 ? "OK" : "FALLA",
        detalle:      discrepancias.length === 0
                        ? `DNI ${dniEnTexto} coincide con el legajo`
                        : discrepancias.join(" | "),
        esAutomatico: true,
        peso:         20,
      });

      checks.push({
        id:           "dni_original",
        nombre:       "DNI original (anti-fotocopia)",
        descripcion:  "Verificación de que el DNI no es una fotocopia ni pantalla",
        estado:       esFotocopia ? "FALLA" : "OK",
        detalle:      esFotocopia
                        ? "⚠ La imagen podría ser una fotocopia o captura de pantalla"
                        : "Imagen parece ser un documento original",
        esAutomatico: true,
        peso:         15,
      });

    } catch (e) {
      checks.push({
        id: "ocr_dni", nombre: "OCR — Lectura DNI", descripcion: "",
        estado: "MANUAL", detalle: "Error al procesar con Vision API — revisar manualmente",
        esAutomatico: false, peso: 20,
      });
    }
  }

  // ── Detección de rostro en selfie ──────────────────────────────────────────
  if (cfg.visionCompararRostros && legajo.selfieUrl) {
    try {
      const visionRes = await callVision(legajo.selfieUrl, [
        { type: "FACE_DETECTION", maxResults: 3 },
      ]);
      const caras = visionRes.responses?.[0]?.faceAnnotations || [];

      checks.push({
        id:           "rostro_selfie",
        nombre:       "Detección de rostro",
        descripcion:  "Verificación de que la selfie contiene un rostro claro",
        estado:       caras.length === 1 ? "OK" : caras.length === 0 ? "FALLA" : "MANUAL",
        detalle:      caras.length === 0 ? "No se detectó ningún rostro en la selfie"
                    : caras.length === 1 ? "Un rostro detectado correctamente"
                    : `${caras.length} rostros detectados — verificar manualmente`,
        esAutomatico: true,
        peso:         15,
      });
    } catch (e) {
      checks.push({
        id: "rostro_selfie", nombre: "Detección de rostro", descripcion: "",
        estado: "MANUAL", detalle: "Error al procesar con Vision API",
        esAutomatico: false, peso: 15,
      });
    }
  }

  return { checks, ocrDatos };
}

// ── Calcular resultado final ───────────────────────────────────────────────────
export function calcularDecision(
  checks: CheckResult[],
  reglas: Partial<ReglasRevision> = {}
): ResultadoRevision {
  const cfg = { ...REGLAS_DEFAULT, ...reglas };

  const pesototal  = checks.reduce((a, c) => a + c.peso, 0) || 1;
  const pesoOk     = checks.filter(c => c.estado === "OK").reduce((a, c) => a + c.peso, 0);
  const tieneManual= checks.some(c => c.estado === "MANUAL");
  const tieneFalla = checks.some(c => c.estado === "FALLA");

  const score = Math.round((pesoOk / pesototal) * 100);

  const decision: ResultadoRevision["decision"] =
    score >= cfg.umbralAutoAprobacion && !tieneManual && !tieneFalla ? "APROBADO_AUTO" :
    score <= cfg.umbralAutoRechazo                                   ? "RECHAZADO_AUTO" :
                                                                       "REVISION_MANUAL";

  const fallas  = checks.filter(c => c.estado === "FALLA").map(c => c.nombre);
  const manuales= checks.filter(c => c.estado === "MANUAL").map(c => c.nombre);

  const resumen =
    decision === "APROBADO_AUTO"  ? `Todas las validaciones pasaron (${score}/100)` :
    decision === "RECHAZADO_AUTO" ? `Falló: ${fallas.join(", ")} (${score}/100)` :
    `Requiere revisión: ${[...fallas, ...manuales].join(", ")} (${score}/100)`;

  return {
    checks,
    scoreValidacion: score,
    decision,
    requiereManual:  decision === "REVISION_MANUAL",
    resumen,
  };
}

// ── Helper OCR ────────────────────────────────────────────────────────────────
function extraerNombreDni(texto: string): string {
  // Intenta extraer línea después de "APELLIDO" o "NOMBRES"
  const matchApellido = texto.match(/APELLIDO[S]?\s*\n(.+)/i);
  const matchNombre   = texto.match(/NOMBRE[S]?\s*\n(.+)/i);
  if (matchApellido && matchNombre)
    return `${matchApellido[1].trim()} ${matchNombre[1].trim()}`;
  return "";
}
