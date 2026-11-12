import type { JwtService } from '@nestjs/jwt';
import { AuditAction } from '@prisma/client';
import { AuditRetentionService } from '@/modules/audit/audit-retention.service';
import { AuditService } from '@/modules/audit/audit.service';
import { resolveAuditLogPresentation } from '@/modules/audit-logs/utils/audit-log-presentation.util';
import {
  buildAuditLogsWhere,
  mapAuditLogRecord,
} from '@/modules/audit-logs/utils/audit-logs-list.utils';
import { AuthService } from '@/modules/auth/auth.service';
import type {
  AuthRepository,
  AuthUserRecord,
} from '@/modules/auth/repositories/auth.repository';
import { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';

jest.mock('@/common/data-source/data-source.config', () => ({
  getDataSourceMode: jest.fn(() => 'database'),
}));

jest.mock('@/modules/auth/utils/refresh-token.util', () => ({
  generateRefreshToken: jest.fn((userId: string) => `${userId}:segredo`),
  hashRefreshToken: jest.fn((token: string) =>
    Promise.resolve(`hash(${token})`),
  ),
  parseRefreshToken: jest.fn((token: string) => {
    const index = token.indexOf(':');
    return index > 0
      ? { userId: token.slice(0, index), secret: token.slice(index + 1) }
      : null;
  }),
  verifyRefreshToken: jest.fn((hash: string, token: string) =>
    Promise.resolve(hash === `hash(${token})`),
  ),
}));

import { getDataSourceMode } from '@/common/data-source/data-source.config';

function dbUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: 'db-1',
    email: 'real@sebratel.com.br',
    name: 'Usuario Real',
    avatarUrl: null,
    status: 'ACTIVE',
    refreshTokenHash: 'hash(db-1:segredo)',
    roles: ['COLLECTION_AGENT'],
    ...overrides,
  };
}

describe('AuditService', () => {
  it('grava o evento no banco', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = new AuditService({ auditLog: { create } } as never);

    await service.record({
      action: AuditAction.LOGIN,
      entityType: 'AUTH',
      entityId: 'u1',
      performedByUserId: 'u1',
      metadata: { outcome: 'SUCCESS' },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        action: 'LOGIN',
        entityType: 'AUTH',
        entityId: 'u1',
        performedByUserId: 'u1',
        metadata: { outcome: 'SUCCESS' },
      },
    });
  });

  it('nunca lanca: falha de gravacao nao derruba a acao principal', async () => {
    const create = jest.fn().mockRejectedValue(new Error('banco fora'));
    const service = new AuditService({ auditLog: { create } } as never);

    await expect(
      service.record({
        action: AuditAction.EXPORT,
        entityType: 'EXPORT',
        entityId: 'collection_cases',
      }),
    ).resolves.toBeUndefined();
  });

  it('nao grava fora do modo banco de dados', async () => {
    jest.mocked(getDataSourceMode).mockReturnValueOnce('mock');
    const create = jest.fn();
    const service = new AuditService({ auditLog: { create } } as never);

    await service.record({
      action: AuditAction.LOGIN,
      entityType: 'AUTH',
      entityId: 'u1',
    });

    expect(create).not.toHaveBeenCalled();
  });
});

describe('AuditRetentionService', () => {
  it('apaga so login, logout e exportacao com mais de 12 meses', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 4 });
    const service = new AuditRetentionService({
      auditLog: { deleteMany },
    } as never);
    const now = new Date('2026-11-07T12:00:00.000Z');

    await expect(service.purgeOldAccessEvents(now)).resolves.toBe(4);

    const where = (
      deleteMany.mock.calls[0] as [
        { where: { action: { in: string[] }; createdAt: { lt: Date } } },
      ]
    )[0].where;
    expect(where.action.in).toEqual(['LOGIN', 'LOGOUT', 'EXPORT']);
    expect(where.createdAt.lt.toISOString()).toBe('2025-11-07T12:00:00.000Z');
  });
});

describe('AuthService registra acessos', () => {
  const original = { ...process.env };
  let repository: { [K in keyof AuthRepository]: jest.Mock };
  let record: jest.Mock;
  let service: AuthService;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_AUTH_MODE = 'real';
    repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
      updateGoogleProfile: jest.fn().mockResolvedValue(undefined),
      updateRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
    };
    record = jest.fn().mockResolvedValue(undefined);
    service = new AuthService(
      repository,
      {
        verifyIdToken: jest.fn().mockResolvedValue({
          email: 'real@sebratel.com.br',
          name: 'Nome Google',
          picture: null,
        }),
      },
      {
        signAsync: jest.fn().mockResolvedValue('jwt'),
        verifyAsync: jest.fn().mockResolvedValue({ sub: 'db-1' }),
      } as unknown as JwtService,
      { record } as unknown as AuditService,
    );
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('grava o login com sucesso', async () => {
    repository.findByEmail.mockResolvedValue(dbUser());

    await service.loginWithGoogle({ idToken: 'tok' });

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN',
        entityType: 'AUTH',
        performedByUserId: 'db-1',
        metadata: { outcome: 'SUCCESS', method: 'GOOGLE' },
      }),
    );
  });

  it('grava a tentativa recusada de e-mail nao cadastrado e de usuario inativo', async () => {
    await expect(service.loginWithGoogle({ idToken: 'tok' })).rejects.toThrow();
    expect(record).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'LOGIN',
        performedByUserId: null,
        metadata: {
          outcome: 'DENIED',
          reason: 'NOT_REGISTERED',
          method: 'GOOGLE',
          email: 'real@sebratel.com.br',
        },
      }),
    );

    repository.findByEmail.mockResolvedValue(dbUser({ status: 'INACTIVE' }));
    await expect(service.loginWithGoogle({ idToken: 'tok' })).rejects.toThrow();
    expect(record).toHaveBeenLastCalledWith(
      expect.objectContaining({
        performedByUserId: 'db-1',
        metadata: {
          outcome: 'DENIED',
          reason: 'INACTIVE',
          method: 'GOOGLE',
          email: 'real@sebratel.com.br',
        },
      }),
    );
  });

  it('grava o logout, mas nao a renovacao da sessao', async () => {
    repository.findByEmail.mockResolvedValue(dbUser());

    await service.logout({}, 'Bearer abc');
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGOUT',
        performedByUserId: 'db-1',
      }),
    );

    record.mockClear();
    repository.findById.mockResolvedValue(dbUser());
    await service
      .refresh({ refreshToken: 'db-1:segredo' })
      .catch(() => undefined);
    expect(record).not.toHaveBeenCalled();
  });
});

describe('exportacao de casos registra auditoria', () => {
  it('grava quem exportou, quantas linhas e os filtros (sem paginacao)', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const listCases = jest.fn().mockResolvedValue({
      items: [
        {
          id: 'c1',
          customerName: 'ACME',
          contractCode: '1',
          status: 'CLOSED',
          priority: 'LOW',
          daysOverdue: 3,
          outstandingAmount: '10.00',
          assignedTo: null,
          slaDueAt: null,
        },
      ],
      pagination: { page: 1, limit: 5000, total: 1, totalPages: 1 },
    });
    const service = new CollectionCasesService(
      { listCases } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { record } as unknown as AuditService,
    );

    const csv = await service.exportCasesCsv(
      {
        page: 2,
        limit: 10,
        status: 'CLOSED',
        search: 'ana',
        sortBy: 'daysOverdue',
      },
      { id: 'usr_1', roles: ['SUPERVISOR'] } as never,
    );

    expect(csv).toContain('ACME');
    expect(record).toHaveBeenCalledWith({
      action: 'EXPORT',
      entityType: 'EXPORT',
      entityId: 'collection_cases',
      performedByUserId: 'usr_1',
      metadata: {
        resourceType: 'COLLECTION_CASES_CSV',
        rows: 1,
        filters: { status: 'CLOSED', search: 'ana' },
      },
    });
  });
});

describe('apresentacao de acessos e exportacoes', () => {
  it('descreve login, logout e acesso recusado', () => {
    expect(
      resolveAuditLogPresentation({
        action: 'LOGIN',
        metadata: { outcome: 'SUCCESS' },
      }),
    ).toEqual({
      category: 'ACCESS',
      verb: 'entrou na plataforma',
      detail: null,
    });
    expect(resolveAuditLogPresentation({ action: 'LOGOUT' }).verb).toBe(
      'saiu da plataforma',
    );

    const denied = resolveAuditLogPresentation({
      action: 'LOGIN',
      metadata: {
        outcome: 'DENIED',
        reason: 'NOT_REGISTERED',
        email: 'x@fora.com',
      },
    });
    expect(denied.verb).toBe('teve o acesso recusado');
    expect(denied.detail).toContain('x@fora.com');
    expect(denied.detail).toContain('não cadastrado');
  });

  it('descreve a exportacao com linhas e filtros', () => {
    const result = resolveAuditLogPresentation({
      action: 'EXPORT',
      metadata: { rows: 120, filters: { status: 'CLOSED', search: 'ana' } },
    });

    expect(result.category).toBe('EXPORT');
    expect(result.verb).toBe('exportou 120 casos em CSV');
    expect(result.detail).toBe('status: CLOSED · search: ana');

    expect(
      resolveAuditLogPresentation({
        action: 'EXPORT',
        metadata: { rows: 1, filters: {} },
      }),
    ).toMatchObject({ verb: 'exportou 1 caso em CSV', detail: 'Sem filtros' });
  });

  it('usa o e-mail como rotulo quando nao ha usuario e filtra por acesso/exportacao', () => {
    const item = mapAuditLogRecord({
      id: 'a1',
      entityType: 'AUTH',
      entityId: 'x@fora.com',
      action: 'LOGIN',
      metadata: {
        outcome: 'DENIED',
        reason: 'NOT_REGISTERED',
        email: 'x@fora.com',
      },
      createdAt: new Date('2026-11-07T10:00:00.000Z'),
      performedBy: null,
    });

    expect(item.actor).toBeNull();
    expect(item.actorLabel).toBe('x@fora.com');
    expect(item.category).toBe('ACCESS');

    expect(buildAuditLogsWhere({ category: 'ACCESS' }).AND).toEqual([
      { action: { in: ['LOGIN', 'LOGOUT'] } },
    ]);
    expect(buildAuditLogsWhere({ category: 'EXPORT' }).AND).toEqual([
      { action: 'EXPORT' },
    ]);
  });
});
