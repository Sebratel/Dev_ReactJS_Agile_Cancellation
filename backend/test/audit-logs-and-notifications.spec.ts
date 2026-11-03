/* eslint-disable @typescript-eslint/no-unsafe-assignment -- matchers do jest (expect.*) retornam any */
import type { PrismaService } from '@/database/prisma/prisma.service';
import { AuditLogsPrismaRepository } from '@/modules/audit-logs/repositories/audit-logs-prisma.repository';
import { resolveAuditLogSummary } from '@/modules/audit-logs/utils/audit-log-summary.util';
import {
  buildAuditLogsWhere,
  filterMockAuditLogs,
  mapAuditLogRecord,
  normalizeAuditLogsListParams,
  type MockAuditLogListRecord,
} from '@/modules/audit-logs/utils/audit-logs-list.utils';
import { NotificationsMockRepository } from '@/modules/notifications/repositories/notifications-mock.repository';

describe('resolveAuditLogSummary (ramos adicionais)', () => {
  it.each([
    [
      'STATUS_CHANGE',
      { resourceType: 'CANCELLATION_PROCESS', action: 'COMPLETED' },
      'Processo de cancelamento concluido',
    ],
    [
      'STATUS_CHANGE',
      { resourceType: 'CANCELLATION_STEP', action: 'COMPLETED' },
      'Etapa de cancelamento concluida',
    ],
    [
      'STATUS_CHANGE',
      { resourceType: 'PAYMENT_PROMISE', action: 'FULFILLED' },
      'Promessa de pagamento cumprida',
    ],
    [
      'STATUS_CHANGE',
      { resourceType: 'PAYMENT_PROMISE', action: 'BROKEN' },
      'Promessa de pagamento quebrada',
    ],
    [
      'STATUS_CHANGE',
      { resourceType: 'PAYMENT_PROMISE', action: 'CANCELLED' },
      'Promessa de pagamento cancelada',
    ],
    [
      'STATUS_CHANGE',
      { resourceType: 'PAYMENT_PROMISE', action: 'OUTRA' },
      'Status alterado',
    ],
    ['STATUS_CHANGE', ['lista'], 'Status alterado'],
    ['CREATE', {}, 'Registro criado'],
    ['UPDATE', undefined, 'Registro atualizado'],
    ['DELETE', null, 'Registro excluido'],
    ['LOGIN', null, 'Login realizado'],
    ['LOGOUT', null, 'Logout realizado'],
    ['IMPORT', null, 'Importacao realizada'],
    ['INTEGRATION', null, 'Integracao executada'],
    ['ACAO_NOVA', null, 'ACAO_NOVA'],
  ])('%s com %j => %s', (action, metadata, expected) => {
    expect(resolveAuditLogSummary(action, metadata)).toBe(expected);
  });
});

describe('audit-logs-list.utils', () => {
  it('normaliza parametros com defaults e limites', () => {
    const result = normalizeAuditLogsListParams({
      page: 0,
      limit: 1000,
      search: ' x ',
      actorId: ' ',
      entityType: ' Case ',
      entityId: '',
    });
    expect(result).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 100,
        search: 'x',
        actorId: undefined,
        entityType: 'Case',
        entityId: undefined,
      }),
    );
    const defaults = normalizeAuditLogsListParams({});
    expect(defaults.page).toBe(1);
    expect(defaults.limit).toBe(20);
  });

  it('monta where com todos os filtros', () => {
    const where = buildAuditLogsWhere({
      actorId: 'u1',
      entityType: 'COLLECTION_CASE',
      entityId: 'c1',
      action: 'UPDATE',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      search: 'UPDATE',
    });
    expect(where.performedByUserId).toBe('u1');
    expect(where.entityType).toBe('COLLECTION_CASE');
    expect(where.entityId).toBe('c1');
    expect(where.action).toBe('UPDATE');
    expect(where.createdAt).toEqual({
      gte: expect.any(Date),
      lte: expect.any(Date),
    });
    expect(where.OR).toHaveLength(5);
  });

  it('monta where parcial (apenas data final, busca que nao e acao)', () => {
    const where = buildAuditLogsWhere({
      endDate: '2026-06-02',
      search: 'texto',
    });
    expect(where.createdAt).toEqual({ lte: expect.any(Date) });
    expect(where.OR).toHaveLength(4);
    expect(buildAuditLogsWhere({ startDate: '2026-06-01' }).createdAt).toEqual({
      gte: expect.any(Date),
    });
    expect(buildAuditLogsWhere({})).toEqual({});
  });

  it('mapeia registros com e sem autor e data em texto', () => {
    const withActor = mapAuditLogRecord({
      id: 'a1',
      entityType: 'COLLECTION_CASE',
      entityId: 'c1',
      action: 'CREATE',
      metadata: { attemptId: 'att' },
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      performedBy: { id: 'u1', name: 'Ana', email: 'ana@x.com' },
    });
    expect(withActor.actor).toEqual({
      id: 'u1',
      name: 'Ana',
      email: 'ana@x.com',
    });
    expect(withActor.summary).toBe('Tentativa de cobranca registrada');
    expect(withActor.createdAt).toBe('2026-06-01T00:00:00.000Z');

    const noActor = mapAuditLogRecord({
      id: 'a2',
      entityType: 'X',
      entityId: 'y',
      action: 'LOGIN',
      createdAt: '2026-06-01',
    });
    expect(noActor.actor).toBeNull();
    expect(noActor.createdAt).toBe('2026-06-01');
  });

  describe('filterMockAuditLogs', () => {
    const records: MockAuditLogListRecord[] = [
      {
        id: '1',
        entityType: 'CASE',
        entityId: 'c1',
        action: 'UPDATE',
        performedByUserId: 'u1',
        actorName: 'Ana',
        actorEmail: 'ana@x.com',
        metadata: {},
        createdAt: '2026-06-01T10:00:00.000Z',
      },
      {
        id: '2',
        entityType: 'USER',
        entityId: 'u9',
        action: 'LOGIN',
        performedByUserId: null,
        actorName: null,
        actorEmail: null,
        metadata: {},
        createdAt: '2026-06-05T10:00:00.000Z',
      },
    ];
    const ids = (params: Parameters<typeof filterMockAuditLogs>[1]) =>
      filterMockAuditLogs(records, params).map((r) => r.id);

    it('ordena por data decrescente sem filtros', () => {
      expect(ids({})).toEqual(['2', '1']);
    });

    it('aplica cada filtro', () => {
      expect(ids({ actorId: 'u1' })).toEqual(['1']);
      expect(ids({ entityType: 'USER' })).toEqual(['2']);
      expect(ids({ entityId: 'c1' })).toEqual(['1']);
      expect(ids({ action: 'LOGIN' })).toEqual(['2']);
      expect(ids({ startDate: '2026-06-03' })).toEqual(['2']);
      expect(ids({ endDate: '2026-06-02' })).toEqual(['1']);
      expect(ids({ search: 'ANA@X' })).toEqual(['1']);
      expect(ids({ search: 'login' })).toEqual(['2']);
    });
  });
});

describe('AuditLogsPrismaRepository', () => {
  it('lista com paginacao e mapeia os registros', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'a1',
        entityType: 'CASE',
        entityId: 'c1',
        action: 'UPDATE',
        metadata: null,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        performedBy: null,
      },
    ]);
    const count = jest.fn().mockResolvedValue(21);
    const repository = new AuditLogsPrismaRepository({
      auditLog: { findMany, count },
    } as unknown as PrismaService);

    const result = await repository.listAuditLogs({
      page: 2,
      limit: 10,
      entityType: 'CASE',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: { entityType: 'CASE' },
      }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
    });
    expect(result.items[0]?.summary).toBe('Registro atualizado');
  });
});

describe('NotificationsMockRepository', () => {
  const base = { type: 'INFO', title: 'T', body: 'B' };

  it('cria, lista (mais recentes primeiro) e pagina', async () => {
    const repository = new NotificationsMockRepository();
    await repository.create({ ...base, userId: 'u1', title: 'primeira' });
    await repository.create({
      ...base,
      userId: 'u1',
      title: 'segunda',
      entityType: 'CASE',
      entityId: 'c1',
    });

    const all = await repository.list({
      userId: 'u1',
      page: 1,
      limit: 10,
      unreadOnly: false,
    });
    expect(all.items.map((n) => n.title)).toEqual(['segunda', 'primeira']);
    expect(all.items[0]?.entityId).toBe('c1');
    expect(all.items[1]?.entityId).toBeNull();

    const page2 = await repository.list({
      userId: 'u1',
      page: 2,
      limit: 1,
      unreadOnly: false,
    });
    expect(page2.items.map((n) => n.title)).toEqual(['primeira']);
  });

  it('marca como lida, conta nao lidas e filtra', async () => {
    const repository = new NotificationsMockRepository();
    const first = await repository.create({ ...base, userId: 'u1' });
    await repository.create({ ...base, userId: 'u1' });

    await expect(repository.countUnread('u1')).resolves.toBe(2);
    await expect(repository.markAsRead(first.id, 'outro')).resolves.toBeNull();
    await expect(
      repository.markAsRead('inexistente', 'u1'),
    ).resolves.toBeNull();

    const read = await repository.markAsRead(first.id, 'u1');
    expect(read?.readAt).not.toBeNull();
    const again = await repository.markAsRead(first.id, 'u1');
    expect(again?.readAt).toBe(read?.readAt);

    await expect(repository.countUnread('u1')).resolves.toBe(1);
    const unread = await repository.list({
      userId: 'u1',
      page: 1,
      limit: 10,
      unreadOnly: true,
    });
    expect(unread.items).toHaveLength(1);

    await expect(repository.markAllAsRead('u1')).resolves.toBe(1);
    await expect(repository.markAllAsRead('u1')).resolves.toBe(0);
    await expect(repository.markAllAsRead('ninguem')).resolves.toBe(0);
  });

  it('lista apenas administradores e supervisores', async () => {
    const repository = new NotificationsMockRepository();
    const ids = await repository.listSupervisorUserIds();
    expect(ids.length).toBeGreaterThan(0);
  });
});
