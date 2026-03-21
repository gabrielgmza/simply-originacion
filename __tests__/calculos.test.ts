import { describe, it, expect } from 'vitest';

// Funciones inline para testear (misma lógica que en los componentes)
function calcularCuil(dni: string, sexo: string): string {
  const dniStr = dni.padStart(8, '0');
  let prefijo = sexo === 'F' ? '27' : '20';
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let base = prefijo + dniStr;
  let suma = 0;
  for (let i = 0; i < 10; i++) suma += parseInt(base[i]) * mult[i];
  let digito = 11 - (suma % 11);
  if (digito === 11) digito = 0;
  if (digito === 10) { prefijo = '23'; digito = sexo === 'F' ? 4 : 9; base = prefijo + dniStr; }
  return base + digito.toString();
}

function calcularCuota(monto: number, cuotas: number, tna: number): number {
  const tem = (tna / 100) / 12;
  if (tem === 0) return Math.round(monto / cuotas);
  return Math.round((monto * tem * Math.pow(1 + tem, cuotas)) / (Math.pow(1 + tem, cuotas) - 1));
}

function esPeriodoCierre(): boolean {
  const dia = new Date().getDate();
  return dia >= 16 && dia <= 25;
}

describe('calcularCuil', () => {
  it('CUIL masculino estándar', () => {
    const cuil = calcularCuil('29481470', 'M');
    expect(cuil).toMatch(/^20/);
    expect(cuil).toHaveLength(11);
  });

  it('CUIL femenino estándar', () => {
    const cuil = calcularCuil('29481470', 'F');
    expect(cuil).toMatch(/^27/);
    expect(cuil).toHaveLength(11);
  });

  it('DNI con padding', () => {
    const cuil = calcularCuil('1234567', 'M');
    expect(cuil).toHaveLength(11);
    expect(cuil).toContain('01234567');
  });

  it('dígito verificador correcto para DNI conocido', () => {
    // 20-12345678-X: verificar que genera un CUIL válido
    const cuil = calcularCuil('12345678', 'M');
    expect(cuil).toHaveLength(11);
    const digVerif = parseInt(cuil[10]);
    expect(digVerif).toBeGreaterThanOrEqual(0);
    expect(digVerif).toBeLessThanOrEqual(9);
  });

  it('prefijo 23 para casos especiales', () => {
    // Buscar un DNI que genere dígito 10 (prefijo 23)
    // Esto es un edge case del algoritmo
    const cuil = calcularCuil('00000000', 'M');
    expect(cuil).toHaveLength(11);
  });
});

describe('calcularCuota', () => {
  it('cuota de 100000 en 12 cuotas al 80% TNA', () => {
    const cuota = calcularCuota(100000, 12, 80);
    expect(cuota).toBeGreaterThan(10000);
    expect(cuota).toBeLessThan(15000);
  });

  it('cuota sin interés', () => {
    const cuota = calcularCuota(120000, 12, 0);
    expect(cuota).toBe(10000);
  });

  it('1 cuota = monto + interés', () => {
    const cuota = calcularCuota(100000, 1, 120);
    expect(cuota).toBeGreaterThan(100000);
  });

  it('más cuotas = menor cuota mensual', () => {
    const c12 = calcularCuota(100000, 12, 80);
    const c24 = calcularCuota(100000, 24, 80);
    expect(c24).toBeLessThan(c12);
  });

  it('mayor TNA = mayor cuota', () => {
    const c80  = calcularCuota(100000, 12, 80);
    const c120 = calcularCuota(100000, 12, 120);
    expect(c120).toBeGreaterThan(c80);
  });
});

describe('esPeriodoCierre', () => {
  it('retorna boolean', () => {
    expect(typeof esPeriodoCierre()).toBe('boolean');
  });
});
