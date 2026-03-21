import { describe, it, expect } from 'vitest';
import { validarAccesoEntidad } from '@/lib/auth/validate-entidad';

describe('validarAccesoEntidad', () => {
  it('rechaza sin sesión', () => {
    const { ok, error } = validarAccesoEntidad(null, 'entidad-1');
    expect(ok).toBe(false);
    expect(error).toBe('No autorizado');
  });

  it('MASTER_PAYSUR puede acceder a cualquier entidad', () => {
    const session = { uid: 'u1', rol: 'MASTER_PAYSUR', entidadId: 'otra' };
    const { ok } = validarAccesoEntidad(session, 'entidad-1');
    expect(ok).toBe(true);
  });

  it('GERENTE_GENERAL puede acceder a su propia entidad', () => {
    const session = { uid: 'u1', rol: 'GERENTE_GENERAL', entidadId: 'entidad-1' };
    const { ok } = validarAccesoEntidad(session, 'entidad-1');
    expect(ok).toBe(true);
  });

  it('GERENTE_GENERAL NO puede acceder a otra entidad', () => {
    const session = { uid: 'u1', rol: 'GERENTE_GENERAL', entidadId: 'entidad-1' };
    const { ok, error } = validarAccesoEntidad(session, 'entidad-2');
    expect(ok).toBe(false);
    expect(error).toContain('permiso');
  });

  it('VENDEDOR puede acceder a su propia entidad', () => {
    const session = { uid: 'u1', rol: 'VENDEDOR', entidadId: 'entidad-1' };
    const { ok } = validarAccesoEntidad(session, 'entidad-1');
    expect(ok).toBe(true);
  });

  it('VENDEDOR NO puede acceder a otra entidad', () => {
    const session = { uid: 'u1', rol: 'VENDEDOR', entidadId: 'entidad-1' };
    const { ok } = validarAccesoEntidad(session, 'entidad-2');
    expect(ok).toBe(false);
  });

  it('LIQUIDADOR en su entidad', () => {
    const session = { uid: 'u1', rol: 'LIQUIDADOR', entidadId: 'e1' };
    expect(validarAccesoEntidad(session, 'e1').ok).toBe(true);
    expect(validarAccesoEntidad(session, 'e2').ok).toBe(false);
  });

  it('FONDEADOR en su entidad', () => {
    const session = { uid: 'u1', rol: 'FONDEADOR', entidadId: 'e1' };
    expect(validarAccesoEntidad(session, 'e1').ok).toBe(true);
    expect(validarAccesoEntidad(session, 'e2').ok).toBe(false);
  });
});
