import { describe, expect, it } from 'vitest';
import { resolveAppPageTitle } from '@/app/layouts/resolve-app-page-title';

describe('resolveAppPageTitle', () => {
  it('resolve titulo exato da rota', () => {
    expect(resolveAppPageTitle('/dashboard')).toBe('Visão geral');
    expect(resolveAppPageTitle('/supervisao')).toBe('Supervisão');
    expect(resolveAppPageTitle('/auditoria')).toBe('Auditoria');
  });

  it('resolve titulo do detalhe do caso', () => {
    expect(resolveAppPageTitle('/supervisao/case_0001')).toBe(
      'Detalhe do caso',
    );
  });

  it('retorna SEBRATEL para rota desconhecida', () => {
    expect(resolveAppPageTitle('/rota-inexistente')).toBe('SEBRATEL');
  });
});
