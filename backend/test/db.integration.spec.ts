import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import { SEED_DEMO_SCENARIO_CASES } from '../prisma/seed/definitions';
import { runDevelopmentSeed } from '../prisma/seed/run-seed';
import { runDemoReset } from '../prisma/seed/run-demo-reset';
import { DashboardPrismaRepository } from '@/modules/dashboard/repositories/dashboard-prisma.repository';
import { CollectionCasesPrismaRepository } from '@/modules/collection-cases/repositories/collection-cases-prisma.repository';
import type { PrismaService } from '@/database/prisma/prisma.service';
import type { DashboardOperationsResponse } from '@/modules/dashboard/dto/dashboard-operations.response';
import type { DashboardSummaryResponse } from '@/modules/dashboard/dto/dashboard-summary.response';
import type { CollectionAttemptResponse } from '@/modules/collection-cases/dto/collection-attempt.response';
import type { PaymentPromiseResponse } from '@/modules/collection-cases/dto/payment-promise.response';
import type { CollectionCaseDetailsResponse } from '@/modules/collection-cases/dto/collection-case-details.response';
import type { CollectionCaseTimelineResponse } from '@/modules/collection-cases/dto/collection-case-timeline.response';
import type { CollectionCaseListItemResponse } from '@/modules/collection-cases/dto/collection-case-list-item.response';
import type { AuditLogListItemResponse } from '@/modules/audit-logs/dto/audit-log-list-item.response';
import type { PaginatedResponse } from '@/common/pagination/paginated-response';
import { COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED } from '@/modules/cancellations/constants/collection-case-closure.constants';
import { DEFAULT_CANCELLATION_STEP_DEFINITIONS } from '@/modules/cancellations/constants/default-cancellation-steps.constants';
import {
  authHeader,
  loginSeededAdmin,
  loginSeededFinance,
} from './helpers/auth-test.helper';
import { getApiErrorCode } from './helpers/api-error-test.helper';

type ApiEnvelope<TData> = {
  data: TData;
  timestamp: string;
};

const shouldRunDbIntegration = process.env.RUN_DB_INTEGRATION === 'true';

const describeDb = shouldRunDbIntegration ? describe : describe.skip;

const SEED_CANCELLATION_CASE_EXTERNAL_ID = 'seed-case-004';

async function prepareEligibleCancellationCase(client: PrismaClient) {
  const collectionCase = await client.collectionCase.findUnique({
    where: { externalId: SEED_CANCELLATION_CASE_EXTERNAL_ID },
    include: {
      cancellationProcesses: {
        include: { steps: true },
      },
    },
  });

  if (!collectionCase) {
    throw new Error(
      `Caso seed ${SEED_CANCELLATION_CASE_EXTERNAL_ID} nao encontrado.`,
    );
  }

  const processIds = collectionCase.cancellationProcesses.map(
    (process) => process.id,
  );

  if (processIds.length > 0) {
    await client.cancellationStep.deleteMany({
      where: {
        cancellationProcessId: {
          in: processIds,
        },
      },
    });

    await client.cancellationProcess.deleteMany({
      where: {
        id: {
          in: processIds,
        },
      },
    });
  }

  await client.collectionCase.update({
    where: { id: collectionCase.id },
    data: {
      status: 'ELIGIBLE_FOR_CANCELLATION',
    },
  });

  return collectionCase.id;
}

describeDb('Database integration', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    await runDevelopmentSeed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('conecta Prisma ao MySQL', async () => {
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });

  it('executa seed idempotente sem erro', async () => {
    await expect(runDevelopmentSeed(prisma)).resolves.toBeUndefined();
  });

  it('seed cria role e usuario financeiro', async () => {
    const [financeRole, financeUser] = await Promise.all([
      prisma.role.findUnique({ where: { code: 'FINANCE' } }),
      prisma.user.findUnique({
        where: { email: 'finance@ger.local' },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      }),
    ]);

    expect(financeRole).not.toBeNull();
    expect(financeUser).not.toBeNull();
    expect(
      financeUser?.userRoles.some((entry) => entry.role.code === 'FINANCE'),
    ).toBe(true);
  });

  it('calcula dashboard summary em database', async () => {
    const repository = new DashboardPrismaRepository(prisma as PrismaService);
    const summary = await repository.getSummary();

    expect(summary.metrics.openAmount).toEqual(expect.any(String));
    expect(summary.statusDistribution.length).toBeGreaterThan(0);
    expect(summary.recoveryTrend).toHaveLength(7);
  });

  it('calcula dashboard operations em database', async () => {
    const repository = new DashboardPrismaRepository(prisma as PrismaService);
    const operations = await repository.getOperations();

    expect(operations.collection.activeCases).toBeGreaterThan(0);
    expect(operations.promises.fulfillmentRate).toBeGreaterThanOrEqual(0);
    expect(operations.promises.fulfillmentRate).toBeLessThanOrEqual(1);
    expect(
      operations.cancellations.averageCompletionDays,
    ).toBeGreaterThanOrEqual(0);
    expect(operations.financial.outstandingAmount).toEqual(expect.any(String));
    expect(
      operations.cancellations.mostBlockedStep.count,
    ).toBeGreaterThanOrEqual(0);
  });

  it('lista collection cases em database', async () => {
    const repository = new CollectionCasesPrismaRepository(
      prisma as PrismaService,
    );
    const result = await repository.listCases({ page: 1, limit: 10 });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.pagination.total).toBeGreaterThan(0);
  });

  it('retorna collection case details em database', async () => {
    const repository = new CollectionCasesPrismaRepository(
      prisma as PrismaService,
    );
    const list = await repository.listCases({ page: 1, limit: 1 });
    const caseId = list.items[0]?.id;

    expect(caseId).toBeDefined();

    const details = await repository.getCaseById(caseId as string);

    expect(details).not.toBeNull();
    expect(details?.customer.name).toEqual(expect.any(String));
    expect(details?.contract.code).toEqual(expect.any(String));
    expect(details?.invoices.length).toBeGreaterThan(0);
  });
});

describeDb('Database endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;

  function api(httpServer: Parameters<typeof request>[0]) {
    const headers = authHeader(adminToken);

    return {
      get: (path: string) => request(httpServer).get(path).set(headers),
      post: (path: string) => request(httpServer).post(path).set(headers),
    };
  }

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    await runDevelopmentSeed(prisma);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    adminToken = (await loginSeededAdmin(httpServer)).accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    await prisma.$disconnect();
  });

  it('GET /dashboard/summary responde com database mode', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await api(httpServer)
      .get('/dashboard/summary')
      .expect(200);

    const body = response.body as ApiEnvelope<DashboardSummaryResponse>;

    expect(body.data.metrics).toBeDefined();
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('GET /dashboard/operations responde com database mode', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await api(httpServer)
      .get('/dashboard/operations')
      .expect(200);

    const body = response.body as ApiEnvelope<DashboardOperationsResponse>;

    expect(body.data.collection).toBeDefined();
    expect(body.data.promises).toBeDefined();
    expect(body.data.cancellations).toBeDefined();
    expect(body.data.financial).toBeDefined();
    expect(
      body.data.cancellations.mostBlockedStep.count,
    ).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('GET /collection-cases responde com database mode', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await api(httpServer)
      .get('/collection-cases?page=1&limit=5')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<CollectionCaseListItemResponse>
    >;

    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.pagination.page).toBe(1);
  });

  it('GET /collection-cases filtra interactionStatus=none no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await api(httpServer)
      .get('/collection-cases?page=1&limit=10&interactionStatus=none')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<CollectionCaseListItemResponse>
    >;

    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(10);
  });

  it('GET /collection-cases filtra promiseStatus=ACTIVE no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await api(httpServer)
      .get('/collection-cases?page=1&limit=10&promiseStatus=ACTIVE')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<CollectionCaseListItemResponse>
    >;

    expect(body.data.pagination.page).toBe(1);
  });

  it('GET /audit-logs responde com database mode', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await api(httpServer)
      .get('/audit-logs?page=1&limit=20')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<AuditLogListItemResponse>
    >;

    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(20);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it('POST /collection-cases/:id/attempts cria tentativa e audit log no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const listResponse = await api(httpServer)
      .get('/collection-cases?page=1&limit=1')
      .expect(200);

    const listBody = listResponse.body as ApiEnvelope<
      PaginatedResponse<CollectionCaseListItemResponse>
    >;
    const caseId = listBody.data.items[0]?.id;

    expect(caseId).toBeDefined();

    const createResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/attempts`)
      .send({
        channel: 'WHATSAPP',
        result: 'CONTACTED',
        notes: 'Integracao DB - tentativa registrada.',
        nextContactAt: '2026-06-15T14:00:00.000Z',
      })
      .expect(201);

    const createBody =
      createResponse.body as ApiEnvelope<CollectionAttemptResponse>;

    expect(createBody.data.collectionCaseId).toBe(caseId);
    expect(createBody.data.channel).toBe('WHATSAPP');

    const detailResponse = await api(httpServer)
      .get(`/collection-cases/${caseId}`)
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    const createdAttempt = detailBody.data.attempts.find(
      (attempt) => attempt.id === createBody.data.id,
    );

    expect(createdAttempt).toBeDefined();
    expect(createdAttempt?.nextContactAt).toBe('2026-06-15T14:00:00.000Z');
    expect(createBody.data.nextContactAt).toBe('2026-06-15T14:00:00.000Z');

    const prisma = new PrismaClient();
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityType: 'COLLECTION_CASE',
        entityId: caseId,
        action: 'CREATE',
      },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.$disconnect();

    expect(auditLog).not.toBeNull();
    expect(auditLog?.afterSnapshot).toEqual(
      expect.objectContaining({
        id: createBody.data.id,
        channel: 'WHATSAPP',
      }),
    );
  });

  it('POST /collection-cases/:id/promises cria promessa e audit log no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const listResponse = await api(httpServer)
      .get('/collection-cases?page=1&limit=1')
      .expect(200);

    const listBody = listResponse.body as ApiEnvelope<
      PaginatedResponse<CollectionCaseListItemResponse>
    >;
    const caseId = listBody.data.items[0]?.id;

    expect(caseId).toBeDefined();

    const createResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/promises`)
      .send({
        promisedAmount: 3200.5,
        promisedDate: '2026-08-01T00:00:00.000Z',
        notes: 'Integracao DB - promessa registrada.',
      })
      .expect(201);

    const createBody =
      createResponse.body as ApiEnvelope<PaymentPromiseResponse>;

    expect(createBody.data.collectionCaseId).toBe(caseId);
    expect(createBody.data.promisedAmount).toBe('3200.50');
    expect(createBody.data.notes).toBe('Integracao DB - promessa registrada.');

    const detailResponse = await api(httpServer)
      .get(`/collection-cases/${caseId}`)
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    const createdPromise = detailBody.data.promises.find(
      (promise) => promise.id === createBody.data.id,
    );

    expect(createdPromise).toBeDefined();
    expect(createdPromise?.notes).toBe('Integracao DB - promessa registrada.');
    expect(createdPromise?.createdAt).toEqual(expect.any(String));

    const prisma = new PrismaClient();
    const [auditLog, dbPromise] = await Promise.all([
      prisma.auditLog.findFirst({
        where: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
          action: 'CREATE',
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentPromise.findUnique({
        where: { id: createBody.data.id },
      }),
    ]);

    await prisma.$disconnect();

    expect(dbPromise).not.toBeNull();
    expect(dbPromise?.notes).toBe('Integracao DB - promessa registrada.');
    expect(auditLog).not.toBeNull();
    expect(auditLog?.metadata).toEqual(
      expect.objectContaining({
        resourceType: 'PAYMENT_PROMISE',
        promiseId: createBody.data.id,
      }),
    );
  });

  it('POST fulfill e break atualizam promessa no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const listResponse = await api(httpServer)
      .get('/collection-cases?page=1&limit=1')
      .expect(200);

    const listBody = listResponse.body as ApiEnvelope<
      PaginatedResponse<CollectionCaseListItemResponse>
    >;
    const caseId = listBody.data.items[0]?.id;

    expect(caseId).toBeDefined();

    const createResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/promises`)
      .send({
        promisedAmount: 950,
        promisedDate: '2026-09-01T00:00:00.000Z',
        notes: 'Promessa para fulfill/break DB.',
      })
      .expect(201);

    const createBody =
      createResponse.body as ApiEnvelope<PaymentPromiseResponse>;
    const promiseId = createBody.data.id;

    await api(httpServer)
      .post(`/collection-cases/${caseId}/promises/${promiseId}/fulfill`)
      .send({ notes: 'Confirmado no banco.' })
      .expect(201);

    const prisma = new PrismaClient();

    const fulfilledPromise = await prisma.paymentPromise.findUnique({
      where: { id: promiseId },
    });

    expect(fulfilledPromise?.status).toBe('FULFILLED');
    expect(fulfilledPromise?.fulfilledAt).not.toBeNull();

    const fulfillAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'COLLECTION_CASE',
        entityId: caseId,
        action: 'STATUS_CHANGE',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(fulfillAudit?.metadata).toEqual(
      expect.objectContaining({
        promiseId,
        resourceType: 'PAYMENT_PROMISE',
        action: 'FULFILLED',
      }),
    );

    const breakCreateResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/promises`)
      .send({
        promisedAmount: 450,
        promisedDate: '2026-09-05T00:00:00.000Z',
      })
      .expect(201);

    const breakPromiseId = (
      breakCreateResponse.body as ApiEnvelope<PaymentPromiseResponse>
    ).data.id;

    await api(httpServer)
      .post(`/collection-cases/${caseId}/promises/${breakPromiseId}/break`)
      .send({})
      .expect(201);

    const brokenPromise = await prisma.paymentPromise.findUnique({
      where: { id: breakPromiseId },
    });

    expect(brokenPromise?.status).toBe('BROKEN');
    expect(brokenPromise?.brokenAt).not.toBeNull();

    await prisma.$disconnect();
  });

  it('GET /collection-cases/:id/timeline consolida eventos no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const listResponse = await api(httpServer)
      .get('/collection-cases?page=1&limit=1')
      .expect(200);

    const listBody = listResponse.body as ApiEnvelope<
      PaginatedResponse<CollectionCaseListItemResponse>
    >;
    const caseId = listBody.data.items[0]?.id;

    expect(caseId).toBeDefined();

    await api(httpServer)
      .post(`/collection-cases/${caseId}/attempts`)
      .send({
        channel: 'EMAIL',
        result: 'CONTACTED',
        notes: 'Timeline DB - tentativa.',
      })
      .expect(201);

    const createPromiseResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/promises`)
      .send({
        promisedAmount: 610,
        promisedDate: '2026-10-01T00:00:00.000Z',
      })
      .expect(201);

    const promiseId = (
      createPromiseResponse.body as ApiEnvelope<PaymentPromiseResponse>
    ).data.id;

    await api(httpServer)
      .post(`/collection-cases/${caseId}/promises/${promiseId}/fulfill`)
      .send({})
      .expect(201);

    const timelineResponse = await api(httpServer)
      .get(`/collection-cases/${caseId}/timeline`)
      .expect(200);

    const timelineBody =
      timelineResponse.body as ApiEnvelope<CollectionCaseTimelineResponse>;

    expect(timelineBody.data.caseId).toBe(caseId);
    expect(
      timelineBody.data.events.some((event) => event.type === 'CASE_CREATED'),
    ).toBe(true);
    expect(
      timelineBody.data.events.some(
        (event) => event.type === 'ATTEMPT_CREATED',
      ),
    ).toBe(true);
    expect(
      timelineBody.data.events.some(
        (event) => event.type === 'PAYMENT_PROMISE_CREATED',
      ),
    ).toBe(true);
    expect(
      timelineBody.data.events.some(
        (event) => event.type === 'PAYMENT_PROMISE_FULFILLED',
      ),
    ).toBe(true);

    const timestamps = timelineBody.data.events.map((event) =>
      new Date(event.occurredAt).getTime(),
    );

    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it('POST send-to-cancellation cria processo e audit log no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const caseId = await prepareEligibleCancellationCase(prisma);

    const createResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/send-to-cancellation`)
      .send({
        reason: 'Integracao DB - encaminhamento para cancelamento.',
        notes: 'Cliente recusou acordo.',
      })
      .expect(201);

    const createBody = createResponse.body as ApiEnvelope<{
      id: string;
      collectionCaseId: string;
      status: string;
      reason: string;
    }>;

    expect(createBody.data.collectionCaseId).toBe(caseId);
    expect(createBody.data.reason).toBe(
      'Integracao DB - encaminhamento para cancelamento.',
    );

    const detailResponse = await api(httpServer)
      .get(`/collection-cases/${caseId}`)
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    expect(detailBody.data.status).toBe('CANCELLATION_IN_PROGRESS');
    expect(detailBody.data.cancellationProcess?.id).toBe(createBody.data.id);

    const timelineResponse = await api(httpServer)
      .get(`/collection-cases/${caseId}/timeline`)
      .expect(200);

    const timelineBody =
      timelineResponse.body as ApiEnvelope<CollectionCaseTimelineResponse>;

    expect(
      timelineBody.data.events.some(
        (event) => event.type === 'CASE_SENT_TO_CANCELLATION',
      ),
    ).toBe(true);

    const [dbProcess, auditLog, dbSteps] = await Promise.all([
      prisma.cancellationProcess.findUnique({
        where: { id: createBody.data.id },
      }),
      prisma.auditLog.findFirst({
        where: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
          action: 'STATUS_CHANGE',
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cancellationStep.findMany({
        where: { cancellationProcessId: createBody.data.id },
        orderBy: { stepOrder: 'asc' },
      }),
    ]);

    expect(dbProcess).not.toBeNull();
    expect(dbProcess?.status).toBe('PENDING');

    expect(dbSteps).toHaveLength(8);
    expect(dbSteps[0]?.name).toBe('LOWER_TITLES');
    expect(dbSteps[0]?.status).toBe('PENDING');

    expect(auditLog?.metadata).toEqual(
      expect.objectContaining({
        cancellationProcessId: createBody.data.id,
        resourceType: 'CANCELLATION_PROCESS',
        reason: 'Integracao DB - encaminhamento para cancelamento.',
      }),
    );
  });

  it('POST complete cancellation step conclui etapa no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const caseId = await prepareEligibleCancellationCase(prisma);

    const createResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/send-to-cancellation`)
      .send({ reason: 'Integracao DB - concluir etapa.' })
      .expect(201);

    const createBody = createResponse.body as ApiEnvelope<{ id: string }>;
    const cancellationId = createBody.data.id;

    await api(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .send({
        notes: 'Integracao DB - etapa concluida.',
        externalProtocol: 'DB-PROT-001',
      })
      .expect(201);

    const detailResponse = await api(httpServer)
      .get(`/collection-cases/${caseId}`)
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    const step = detailBody.data.cancellationProcess?.steps.find(
      (item) => item.stepCode === 'LOWER_TITLES',
    );

    expect(step?.status).toBe('COMPLETED');
    expect(step?.externalProtocol).toBe('DB-PROT-001');

    const [dbStep, stepAudit] = await Promise.all([
      prisma.cancellationStep.findFirst({
        where: {
          cancellationProcessId: cancellationId,
          name: 'LOWER_TITLES',
        },
      }),
      prisma.auditLog.findFirst({
        where: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    expect(dbStep?.status).toBe('COMPLETED');
    expect(stepAudit?.metadata).toEqual(
      expect.objectContaining({
        resourceType: 'CANCELLATION_STEP',
        stepCode: 'LOWER_TITLES',
      }),
    );
  });

  it('POST eleven/request conclui OPEN_ELEVEN_REQUEST no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const caseId = await prepareEligibleCancellationCase(prisma);

    const createResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/send-to-cancellation`)
      .send({ reason: 'Integracao DB - Eleven stub.' })
      .expect(201);

    const createBody = createResponse.body as ApiEnvelope<{ id: string }>;
    const cancellationId = createBody.data.id;

    await api(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .send({})
      .expect(201);

    await api(httpServer)
      .post(`/cancellations/${cancellationId}/steps/APPLY_FINE/complete`)
      .send({})
      .expect(201);

    const elevenResponse = await api(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .send({ notes: 'Integracao DB - abrir Eleven.' })
      .expect(201);

    const elevenBody = elevenResponse.body as ApiEnvelope<{
      protocol: string;
      step: {
        stepCode: string;
        status: string;
        externalProtocol: string | null;
      };
    }>;

    expect(elevenBody.data.protocol).toMatch(/^ELEVEN-STUB-\d{8}-[A-F0-9]{4}$/);
    expect(elevenBody.data.step.stepCode).toBe('OPEN_ELEVEN_REQUEST');
    expect(elevenBody.data.step.status).toBe('COMPLETED');
    expect(elevenBody.data.step.externalProtocol).toBe(
      elevenBody.data.protocol,
    );

    const [dbStep, stepAudit, timelineResponse] = await Promise.all([
      prisma.cancellationStep.findFirst({
        where: {
          cancellationProcessId: cancellationId,
          name: 'OPEN_ELEVEN_REQUEST',
        },
      }),
      prisma.auditLog.findFirst({
        where: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
        },
        orderBy: { createdAt: 'desc' },
      }),
      api(httpServer).get(`/collection-cases/${caseId}/timeline`).expect(200),
    ]);

    expect(dbStep?.status).toBe('COMPLETED');
    expect(dbStep?.externalId).toBe(elevenBody.data.protocol);

    expect(stepAudit?.metadata).toEqual(
      expect.objectContaining({
        resourceType: 'CANCELLATION_STEP',
        stepCode: 'OPEN_ELEVEN_REQUEST',
        integration: 'ELEVEN',
      }),
    );

    const timelineBody =
      timelineResponse.body as ApiEnvelope<CollectionCaseTimelineResponse>;

    expect(
      timelineBody.data.events.some(
        (event) => event.type === 'CANCELLATION_STEP_COMPLETED',
      ),
    ).toBe(true);
  });

  it('POST complete cancellation step permite usuario financeiro no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const financeToken = (await loginSeededFinance(httpServer)).accessToken;
    const caseId = await prepareEligibleCancellationCase(prisma);

    const createResponse = await request(httpServer)
      .post(`/collection-cases/${caseId}/send-to-cancellation`)
      .set(authHeader((await loginSeededAdmin(httpServer)).accessToken))
      .send({ reason: 'Integracao DB - usuario financeiro.' })
      .expect(201);

    const createBody = createResponse.body as ApiEnvelope<{ id: string }>;
    const cancellationId = createBody.data.id;

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .set(authHeader(financeToken))
      .send({ notes: 'Baixa financeira via seed FINANCE.' })
      .expect(201);
  });

  it('POST complete cancellation step respeita ordem no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const caseId = await prepareEligibleCancellationCase(prisma);

    const createResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/send-to-cancellation`)
      .send({ reason: 'Integracao DB - ordem de etapas.' })
      .expect(201);

    const createBody = createResponse.body as ApiEnvelope<{ id: string }>;
    const cancellationId = createBody.data.id;

    const response = await api(httpServer)
      .post(`/cancellations/${cancellationId}/steps/APPLY_FINE/complete`)
      .send({})
      .expect(409);

    expect(getApiErrorCode(response.body)).toBe('step_out_of_order');
  });

  it('POST complete OPEN_ELEVEN_REQUEST bloqueia endpoint generico no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const caseId = await prepareEligibleCancellationCase(prisma);

    const createResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/send-to-cancellation`)
      .send({ reason: 'Integracao DB - bloqueio Eleven generico.' })
      .expect(201);

    const createBody = createResponse.body as ApiEnvelope<{ id: string }>;
    const cancellationId = createBody.data.id;

    await api(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .send({})
      .expect(201);

    await api(httpServer)
      .post(`/cancellations/${cancellationId}/steps/APPLY_FINE/complete`)
      .send({})
      .expect(201);

    const response = await api(httpServer)
      .post(
        `/cancellations/${cancellationId}/steps/OPEN_ELEVEN_REQUEST/complete`,
      )
      .send({})
      .expect(409);

    expect(getApiErrorCode(response.body)).toBe('step_requires_integration');
  });

  it('POST complete cancellation steps conclui fluxo ordenado no MySQL', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const caseId = await prepareEligibleCancellationCase(prisma);

    const createResponse = await api(httpServer)
      .post(`/collection-cases/${caseId}/send-to-cancellation`)
      .send({ reason: 'Integracao DB - fluxo ordenado completo.' })
      .expect(201);

    const createBody = createResponse.body as ApiEnvelope<{ id: string }>;
    const cancellationId = createBody.data.id;

    await api(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .send({})
      .expect(201);

    await api(httpServer)
      .post(`/cancellations/${cancellationId}/steps/APPLY_FINE/complete`)
      .send({})
      .expect(201);

    await api(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .send({})
      .expect(201);

    for (const step of DEFAULT_CANCELLATION_STEP_DEFINITIONS.filter(
      (item) =>
        item.stepCode !== 'LOWER_TITLES' &&
        item.stepCode !== 'APPLY_FINE' &&
        item.stepCode !== 'OPEN_ELEVEN_REQUEST',
    )) {
      await api(httpServer)
        .post(
          `/cancellations/${cancellationId}/steps/${step.stepCode}/complete`,
        )
        .send({})
        .expect(201);
    }

    const detailResponse = await api(httpServer)
      .get(`/collection-cases/${caseId}`)
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    expect(detailBody.data.status).toBe(
      COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED,
    );
    expect(detailBody.data.cancellationProcess?.status).toBe('COMPLETED');
    expect(
      detailBody.data.cancellationProcess?.steps.every(
        (step) => step.status === 'COMPLETED',
      ),
    ).toBe(true);

    const blockedResponse = await api(httpServer)
      .post(`/cancellations/${cancellationId}/steps/ROUTE_PROTOCOL/complete`)
      .send({})
      .expect(409);

    expect(getApiErrorCode(blockedResponse.body)).toBe(
      'cancellation_already_completed',
    );
  });

  it('runDemoReset preserva users e roles', async () => {
    const [rolesBefore, usersBefore, adminBefore, financeBefore] =
      await Promise.all([
        prisma.role.count(),
        prisma.user.count(),
        prisma.user.findUnique({ where: { email: 'admin@ger.local' } }),
        prisma.user.findUnique({ where: { email: 'finance@ger.local' } }),
      ]);

    await runDemoReset(prisma, { nodeEnv: 'test', argv: ['--confirm'] });

    const [rolesAfter, usersAfter, adminAfter, financeAfter] =
      await Promise.all([
        prisma.role.count(),
        prisma.user.count(),
        prisma.user.findUnique({
          where: { email: 'admin@ger.local' },
          include: {
            userRoles: { include: { role: true } },
          },
        }),
        prisma.user.findUnique({
          where: { email: 'finance@ger.local' },
          include: {
            userRoles: { include: { role: true } },
          },
        }),
      ]);

    expect(rolesAfter).toBe(rolesBefore);
    expect(usersAfter).toBe(usersBefore);
    expect(adminAfter?.id).toBe(adminBefore?.id);
    expect(financeAfter?.id).toBe(financeBefore?.id);
    expect(
      financeAfter?.userRoles.some(
        (userRole) => userRole.role.code === 'FINANCE',
      ),
    ).toBe(true);
  });

  it('runDemoReset recria cenarios demonstraveis', async () => {
    await runDemoReset(prisma, { nodeEnv: 'test', argv: ['--confirm'] });

    const [
      attemptCase,
      promiseCase,
      eligibleCase,
      inProgressCase,
      completedCase,
    ] = await Promise.all([
      prisma.collectionCase.findUnique({
        where: { externalId: SEED_DEMO_SCENARIO_CASES.attemptReady },
        include: {
          collectionAttempts: true,
          paymentPromises: true,
        },
      }),
      prisma.collectionCase.findUnique({
        where: { externalId: SEED_DEMO_SCENARIO_CASES.promiseReady },
        include: {
          paymentPromises: true,
        },
      }),
      prisma.collectionCase.findUnique({
        where: { externalId: SEED_DEMO_SCENARIO_CASES.sendToCancellationReady },
        include: {
          cancellationProcesses: true,
        },
      }),
      prisma.collectionCase.findUnique({
        where: { externalId: SEED_DEMO_SCENARIO_CASES.cancellationInProgress },
        include: {
          cancellationProcesses: {
            include: { steps: true },
          },
        },
      }),
      prisma.collectionCase.findUnique({
        where: { externalId: SEED_DEMO_SCENARIO_CASES.cancellationCompleted },
        include: {
          cancellationProcesses: {
            include: { steps: true },
          },
        },
      }),
    ]);

    expect(attemptCase?.status).toBe('IN_COLLECTION');
    expect(attemptCase?.collectionAttempts).toHaveLength(0);
    expect(attemptCase?.paymentPromises).toHaveLength(0);

    expect(promiseCase?.status).toBe('IN_COLLECTION');
    expect(promiseCase?.paymentPromises).toHaveLength(0);

    expect(eligibleCase?.status).toBe('ELIGIBLE_FOR_CANCELLATION');
    expect(eligibleCase?.cancellationProcesses).toHaveLength(0);

    expect(inProgressCase?.status).toBe('CANCELLATION_IN_PROGRESS');
    expect(inProgressCase?.cancellationProcesses).toHaveLength(1);
    expect(inProgressCase?.cancellationProcesses[0]?.steps).toHaveLength(8);
    expect(
      inProgressCase?.cancellationProcesses[0]?.steps.every(
        (step) => step.status === 'PENDING',
      ),
    ).toBe(true);

    expect(completedCase?.status).toBe('CLOSED');
    expect(completedCase?.cancellationProcesses).toHaveLength(1);
    expect(completedCase?.cancellationProcesses[0]?.status).toBe('COMPLETED');
    expect(completedCase?.cancellationProcesses[0]?.steps).toHaveLength(8);
    expect(
      completedCase?.cancellationProcesses[0]?.steps.every(
        (step) => step.status === 'COMPLETED',
      ),
    ).toBe(true);
  });
});
