import { describe, expect, it } from 'vitest';
import {
  getRoutesForRole,
  getRoutesForRoles,
} from '@/features/auth/utils/route-access';

function labels(routes: { label: string }[]) {
  return routes.map((route) => route.label);
}

describe('getRoutesForRoles', () => {
  it('mostra só as telas do papel de cobrança', () => {
    const result = labels(getRoutesForRole('COLLECTION_AGENT'));

    expect(result).toContain('Minha cobrança');
    expect(result).not.toContain('Cancelamentos');
  });

  it('une as telas de quem acumula cobrança e cancelamento', () => {
    const result = labels(
      getRoutesForRoles(['COLLECTION_AGENT', 'CANCELLATION_AGENT']),
    );

    expect(result).toContain('Minha cobrança');
    expect(result).toContain('Cancelamentos');
  });

  it('não repete telas quando os papéis se sobrepõem', () => {
    const result = labels(
      getRoutesForRoles(['COLLECTION_AGENT', 'CANCELLATION_AGENT']),
    );

    expect(new Set(result).size).toBe(result.length);
  });
});
