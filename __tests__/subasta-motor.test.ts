import { describe, it, expect } from 'vitest';
import { calcularOfertas, calcularContabilidad, Fondeador } from '@/lib/fondeo/subasta-motor';

const baseFondeador: Fondeador = {
  id: 'f1', entidadId: 'e1', nombre: 'Fondeador A', activo: true,
  productos: ['CUAD', 'PRIVADO', 'ADELANTO'],
  tnaPropia: 80, plazoMaximo: 24, montoMinimo: 10000, montoMaximo: 500000,
  scoringMinimo: 0, cupoMaximo: 10000000, cupoUsado: 0,
  comision: { tipo: 'PORCENTUAL', valor: 2 },
};

describe('calcularOfertas', () => {
  it('devuelve ofertas para fondeadores válidos', () => {
    const ofertas = calcularOfertas(100000, 12, 500, [baseFondeador]);
    expect(ofertas).toHaveLength(1);
    expect(ofertas[0].fondeadorId).toBe('f1');
    expect(ofertas[0].cuotaFinal).toBeGreaterThan(0);
    expect(ofertas[0].totalDevolver).toBeGreaterThan(100000);
    expect(ofertas[0].esOptima).toBe(true);
  });

  it('excluye fondeadores inactivos', () => {
    const inactivo = { ...baseFondeador, activo: false };
    const ofertas = calcularOfertas(100000, 12, 500, [inactivo]);
    expect(ofertas).toHaveLength(0);
  });

  it('excluye por monto menor al mínimo', () => {
    const ofertas = calcularOfertas(5000, 12, 500, [baseFondeador]);
    expect(ofertas).toHaveLength(0);
  });

  it('excluye por monto mayor al máximo', () => {
    const ofertas = calcularOfertas(600000, 12, 500, [baseFondeador]);
    expect(ofertas).toHaveLength(0);
  });

  it('excluye por plazo excedido', () => {
    const ofertas = calcularOfertas(100000, 36, 500, [baseFondeador]);
    expect(ofertas).toHaveLength(0);
  });

  it('excluye por scoring insuficiente', () => {
    const f = { ...baseFondeador, scoringMinimo: 700 };
    const ofertas = calcularOfertas(100000, 12, 500, [f]);
    expect(ofertas).toHaveLength(0);
  });

  it('excluye por cupo agotado', () => {
    const f = { ...baseFondeador, cupoMaximo: 100000, cupoUsado: 50000 };
    const ofertas = calcularOfertas(100000, 12, 500, [f]);
    expect(ofertas).toHaveLength(0);
  });

  it('filtra por producto CUAD', () => {
    const fCuad = { ...baseFondeador, id: 'f1', productos: ['CUAD'] };
    const fPriv = { ...baseFondeador, id: 'f2', nombre: 'Fondeador B', productos: ['PRIVADO'] };
    const ofertas = calcularOfertas(100000, 12, 500, [fCuad, fPriv], 'CUAD');
    expect(ofertas).toHaveLength(1);
    expect(ofertas[0].fondeadorId).toBe('f1');
  });

  it('filtra por producto ADELANTO', () => {
    const fTodos = { ...baseFondeador, id: 'f1', productos: ['CUAD', 'PRIVADO', 'ADELANTO'] };
    const fSoloCuad = { ...baseFondeador, id: 'f2', nombre: 'B', productos: ['CUAD'] };
    const ofertas = calcularOfertas(100000, 12, 500, [fTodos, fSoloCuad], 'ADELANTO');
    expect(ofertas).toHaveLength(1);
    expect(ofertas[0].fondeadorId).toBe('f1');
  });

  it('sin filtro de producto devuelve todos', () => {
    const f1 = { ...baseFondeador, id: 'f1', productos: ['CUAD'] };
    const f2 = { ...baseFondeador, id: 'f2', nombre: 'B', productos: ['PRIVADO'] };
    const ofertas = calcularOfertas(100000, 12, 500, [f1, f2]);
    expect(ofertas).toHaveLength(2);
  });

  it('fondeador sin campo productos pasa el filtro', () => {
    const f = { ...baseFondeador, productos: [] as string[] };
    const ofertas = calcularOfertas(100000, 12, 500, [f], 'CUAD');
    expect(ofertas).toHaveLength(1);
  });

  it('marca la oferta más barata como óptima', () => {
    const f1 = { ...baseFondeador, id: 'f1', tnaPropia: 80 };
    const f2 = { ...baseFondeador, id: 'f2', nombre: 'B', tnaPropia: 120 };
    const ofertas = calcularOfertas(100000, 12, 500, [f1, f2]);
    expect(ofertas[0].esOptima).toBe(true);
    expect(ofertas[0].tna).toBe(80);
    expect(ofertas[1].esOptima).toBe(false);
  });

  it('calcula comisión porcentual correctamente', () => {
    const ofertas = calcularOfertas(100000, 12, 500, [baseFondeador]);
    expect(ofertas[0].comision).toBe(2000); // 2% de 100000
  });

  it('calcula comisión fija correctamente', () => {
    const f = { ...baseFondeador, comision: { tipo: 'FIJA' as const, valor: 5000 } };
    const ofertas = calcularOfertas(100000, 12, 500, [f]);
    expect(ofertas[0].comision).toBe(5000);
  });
});

describe('calcularContabilidad', () => {
  it('calcula capital asignado y cobrado', () => {
    const ops = [
      { financiero: { montoSolicitado: 100000 }, _totalPagado: 50000, estado: 'LIQUIDADO' },
      { financiero: { montoSolicitado: 200000 }, _totalPagado: 200000, estado: 'FINALIZADO' },
    ];
    const result = calcularContabilidad(ops);
    expect(result.capitalAsignado).toBe(300000);
    expect(result.totalCobrado).toBe(250000);
    expect(result.capitalPendiente).toBe(50000);
  });

  it('calcula mora correctamente', () => {
    const ops = [
      { financiero: { montoSolicitado: 100000 }, _totalPagado: 20000, estado: 'EN_MORA' },
      { financiero: { montoSolicitado: 200000 }, _totalPagado: 200000, estado: 'LIQUIDADO' },
    ];
    const result = calcularContabilidad(ops);
    expect(result.capitalEnMora).toBe(100000);
    expect(result.porcMora).toBeGreaterThan(0);
  });

  it('devuelve ceros para array vacío', () => {
    const result = calcularContabilidad([]);
    expect(result.capitalAsignado).toBe(0);
    expect(result.totalCobrado).toBe(0);
    expect(result.porcMora).toBe(0);
  });
});
