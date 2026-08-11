import { describe, expect, it } from 'vitest';
import { buildUsersPath } from '@/features/users/services/users.service';

describe('buildUsersPath', () => {
  it('usa page e limit padrao quando nao informados', () => {
    const path = buildUsersPath({});
    expect(path).toContain('page=1');
    expect(path).toContain('limit=20');
  });

  it('inclui filtros de status, role e search', () => {
    const path = buildUsersPath({
      page: 2,
      limit: 10,
      status: 'ACTIVE',
      role: 'ADMIN',
      search: '  Ana  ',
    });

    expect(path).toContain('page=2');
    expect(path).toContain('limit=10');
    expect(path).toContain('status=ACTIVE');
    expect(path).toContain('role=ADMIN');
    expect(path).toContain('search=Ana');
  });

  it('omite search vazio', () => {
    const path = buildUsersPath({ search: '   ' });
    expect(path).not.toContain('search=');
  });
});
