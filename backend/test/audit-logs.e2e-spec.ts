import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import type { PaginatedResponse } from '@/common/pagination/paginated-response';
import type { AuditLogListItemResponse } from '@/modules/audit-logs/dto/audit-log-list-item.response';
import {
  mockAuditLogs,
  resetMockCollectionCases,
} from '@/modules/collection-cases/mocks/collection-cases.mock';
import {
  authHeader,
  loginAsAdmin,
  loginAsCollectionAgent,
  loginAsSupervisor,
  loginAsViewer,
} from './helpers/auth-test.helper';

type ApiEnvelope<TData> = {
  data: TData;
  timestamp: string;
};

describe('Audit logs (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let supervisorToken: string;
  let viewerToken: string;
  let collectionAgentToken: string;

  function api(httpServer: Parameters<typeof request>[0], token?: string) {
    const headers = token ? authHeader(token) : undefined;

    return {
      get: (path: string) => {
        const req = request(httpServer).get(path);
        return headers ? req.set(headers) : req;
      },
      post: (path: string) => {
        const req = request(httpServer).post(path);
        return headers ? req.set(headers) : req;
      },
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    adminToken = (await loginAsAdmin(httpServer)).accessToken;
    supervisorToken = (await loginAsSupervisor(httpServer)).accessToken;
    viewerToken = (await loginAsViewer(httpServer)).accessToken;
    collectionAgentToken = (await loginAsCollectionAgent(httpServer))
      .accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMockCollectionCases();
  });

  async function seedAttemptAuditLog(
    httpServer: Parameters<typeof request>[0],
  ) {
    const caseId = 'case_0001';

    await api(httpServer, adminToken)
      .post(`/collection-cases/${caseId}/attempts`)
      .send({
        channel: 'PHONE',
        result: 'NO_ANSWER',
        notes: 'Sem retorno',
      })
      .expect(201);

    return caseId;
  }

  it('GET /audit-logs exige autenticacao', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer).get('/audit-logs').expect(401);
  });

  it('VIEWER nao acessa /audit-logs', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer, viewerToken).get('/audit-logs').expect(403);
  });

  it('COLLECTION_AGENT nao acessa /audit-logs', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer, collectionAgentToken).get('/audit-logs').expect(403);
  });

  it('SUPERVISOR acessa /audit-logs', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    await seedAttemptAuditLog(httpServer);

    const response = await api(httpServer, supervisorToken)
      .get('/audit-logs?page=1&limit=20')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<AuditLogListItemResponse>
    >;

    expect(body.data.items.length).toBeGreaterThan(0);
  });

  it('ADMIN acessa /audit-logs', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    await seedAttemptAuditLog(httpServer);

    const response = await api(httpServer, adminToken)
      .get('/audit-logs?page=1&limit=20')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<AuditLogListItemResponse>
    >;

    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(20);
    expect(body.data.items.length).toBeGreaterThan(0);
  });

  it('paginacao funciona', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    await seedAttemptAuditLog(httpServer);
    await seedAttemptAuditLog(httpServer);

    const response = await api(httpServer, adminToken)
      .get('/audit-logs?page=1&limit=1')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<AuditLogListItemResponse>
    >;

    expect(body.data.items).toHaveLength(1);
    expect(body.data.pagination.total).toBeGreaterThanOrEqual(2);
    expect(body.data.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('filtro por actorId funciona', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    // PerformedByResolverService converte IDs de usuarios mock para null (evita
    // violacao de FK no banco real), entao seeds via HTTP sempre geram logs com
    // performedByUserId=null. Empurramos o log diretamente no array mock para
    // testar o filtro sem depender do resolver.
    const actorId = 'user-admin';
    mockAuditLogs.push({
      entityType: 'COLLECTION_CASE',
      entityId: 'case_0001',
      action: 'CREATE',
      performedByUserId: actorId,
      beforeSnapshot: null,
      afterSnapshot: { id: 'att_filter_test' },
      metadata: { attemptId: 'att_filter_test' },
    });

    const response = await api(httpServer, adminToken)
      .get(`/audit-logs?actorId=${actorId}`)
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<AuditLogListItemResponse>
    >;

    expect(body.data.items.length).toBeGreaterThan(0);
    body.data.items.forEach((item) => {
      expect(item.actor?.id).toBe(actorId);
    });
  });

  it('filtro por action funciona', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    await seedAttemptAuditLog(httpServer);

    const response = await api(httpServer, adminToken)
      .get('/audit-logs?action=CREATE')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<AuditLogListItemResponse>
    >;

    expect(body.data.items.length).toBeGreaterThan(0);
    body.data.items.forEach((item) => {
      expect(item.action).toBe('CREATE');
    });
  });

  it('filtro por periodo funciona', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    await seedAttemptAuditLog(httpServer);

    const response = await api(httpServer, adminToken)
      .get('/audit-logs?startDate=2020-01-01&endDate=2099-12-31')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<AuditLogListItemResponse>
    >;

    expect(body.data.items.length).toBeGreaterThan(0);
  });

  it('search funciona', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const caseId = await seedAttemptAuditLog(httpServer);

    const response = await api(httpServer, adminToken)
      .get(`/audit-logs?search=${caseId}`)
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<AuditLogListItemResponse>
    >;

    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.items.some((item) => item.entityId === caseId)).toBe(true);
  });

  it('nao expoe campos sensiveis', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    await seedAttemptAuditLog(httpServer);

    mockAuditLogs.push({
      entityType: 'COLLECTION_CASE',
      entityId: 'case-sensitive',
      action: 'CREATE',
      performedByUserId: 'user-admin',
      beforeSnapshot: null,
      afterSnapshot: { id: 'att_sensitive' },
      metadata: {
        attemptId: 'att_sensitive',
        passwordHash: 'secret',
        refreshTokenHash: 'secret',
        accessToken: 'token',
      },
    });

    const response = await api(httpServer, adminToken)
      .get('/audit-logs?search=case-sensitive')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<AuditLogListItemResponse>
    >;
    const serialized = JSON.stringify(body.data.items[0]);

    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('refreshTokenHash');
    expect(serialized).not.toContain('accessToken');
    expect(body.data.items[0]?.metadata).toEqual({
      attemptId: 'att_sensitive',
    });
  });

  it('retorna summary amigavel para tentativa', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    await seedAttemptAuditLog(httpServer);

    const response = await api(httpServer, adminToken)
      .get('/audit-logs?action=CREATE')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<AuditLogListItemResponse>
    >;

    expect(
      body.data.items.some(
        (item) => item.summary === 'Tentativa de cobranca registrada',
      ),
    ).toBe(true);
  });
});
