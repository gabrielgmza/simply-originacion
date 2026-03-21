import { describe, it, expect } from 'vitest';
import { calcularScoring, CONFIG_SCORING_DEFAULT } from '@/lib/scoring/motor';

describe('calcularScoring', () => {
  const clienteIdeal = {
    fechaNacimiento:       '1985-06-15',
    antiguedadMeses:       60,
    ingresoMensual:        300000,
    estadoCivil:           'CASADO' as const,
    situacionBcraActual:   1,
    peorSituacionHistorica: 1,
    opsPreviasEntidad:     3,
    pagosPuntuales:        30,
    cuotasTotalesPrevias:  36,
    moraPrevia:            false,
  };

  it('cliente ideal obtiene APROBADO con puntaje alto', () => {
    const r = calcularScoring(clienteIdeal);
    expect(r.decision).toBe('APROBADO');
    expect(r.puntaje).toBeGreaterThanOrEqual(CONFIG_SCORING_DEFAULT.umbralAprobado);
  });

  it('cliente con BCRA situación 5 obtiene puntaje bajo', () => {
    const r = calcularScoring({
      ...clienteIdeal,
      situacionBcraActual: 5,
      peorSituacionHistorica: 5,
    });
    expect(r.puntaje).toBeLessThan(CONFIG_SCORING_DEFAULT.umbralAprobado);
    expect(r.alertas.length).toBeGreaterThan(0);
  });

  it('cliente sin datos obtiene puntaje bajo', () => {
    const r = calcularScoring({});
    expect(r.puntaje).toBeLessThan(CONFIG_SCORING_DEFAULT.umbralAprobado);
  });

  it('respeta umbrales personalizados', () => {
    const r = calcularScoring(clienteIdeal, {
      umbralAprobado: 999,
      umbralRevision: 998,
    });
    // Con umbrales altísimos, incluso un buen cliente queda en revisión o rechazado
    expect(r.decision).not.toBe('APROBADO');
  });

  it('breakdown tiene todas las categorías', () => {
    const r = calcularScoring(clienteIdeal);
    const categorias = r.breakdown.map(b => b.categoria);
    expect(categorias).toContain('Edad');
    expect(categorias).toContain('BCRA');
    expect(r.breakdown.length).toBeGreaterThanOrEqual(5);
  });

  it('puntaje está entre 0 y 1000', () => {
    const r = calcularScoring(clienteIdeal);
    expect(r.puntaje).toBeGreaterThanOrEqual(0);
    expect(r.puntaje).toBeLessThanOrEqual(1000);
  });

  it('mora previa genera alerta', () => {
    const r = calcularScoring({
      ...clienteIdeal,
      moraPrevia: true,
      diasMoraMaxima: 30,
    });
    const tieneAlertaMora = r.alertas.some(a => a.toLowerCase().includes('mora'));
    expect(tieneAlertaMora).toBe(true);
  });

  it('edad fuera de rango genera alerta', () => {
    const r = calcularScoring({
      ...clienteIdeal,
      fechaNacimiento: '2010-01-01', // ~16 años
    });
    const tieneAlertaEdad = r.alertas.some(a => a.toLowerCase().includes('edad'));
    expect(tieneAlertaEdad).toBe(true);
  });
});
