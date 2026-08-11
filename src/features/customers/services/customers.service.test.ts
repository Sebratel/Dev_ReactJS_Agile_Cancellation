import { describe, expect, it } from 'vitest';
import { buildCustomersPath } from '@/features/customers/services/customers.service';

describe('buildCustomersPath', () => {
  it('usa page e limit padrao', () => {
    const path = buildCustomersPath({});
    expect(path).toContain('page=1');
    expect(path).toContain('limit=20');
  });

  it('inclui e normaliza a busca', () => {
    const path = buildCustomersPath({
      page: 2,
      limit: 10,
      search: '  Horizonte ',
    });
    expect(path).toContain('page=2');
    expect(path).toContain('limit=10');
    expect(path).toContain('search=Horizonte');
  });

  it('omite busca vazia', () => {
    expect(buildCustomersPath({ search: '   ' })).not.toContain('search=');
  });
});
