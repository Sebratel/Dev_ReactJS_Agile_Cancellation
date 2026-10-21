import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import type { CollectionAttemptResponse } from '@/modules/collection-cases/dto/collection-attempt.response';
import type { CollectionCaseDetailsResponse } from '@/modules/collection-cases/dto/collection-case-details.response';
import type { CollectionCaseTimelineResponse } from '@/modules/collection-cases/dto/collection-case-timeline.response';
import type { CollectionCaseListItemResponse } from '@/modules/collection-cases/dto/collection-case-list-item.response';
import type { PaymentPromiseResponse } from '@/modules/collection-cases/dto/payment-promise.response';
import {
  mockAuditLogs,
  resetMockCollectionCases,
} from '@/modules/collection-cases/mocks/collection-cases.mock';
import type { PaginatedResponse } from '@/common/pagination/paginated-response';
import { authHeader, loginAsAdmin } from './helpers/auth-test.helper';

type ApiEnvelope<TData> = {
  data: TData;
  timestamp: string;
};

describe('Collection cases (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  function api(
    httpServer: Parameters<typeof request>[0],
    token: string = adminToken,
  ) {
    const headers = authHeader(token);

    return {
      get: (path: string) => request(httpServer).get(path).set(headers),
      post: (path: string) => request(httpServer).post(path).set(headers),
      patch: (path: string) => request(httpServer).patch(path).set(headers),
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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    resetMockCollectionCases();
  });

  it('GET /collection-cases retorna paginacao', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await api(httpServer)
      .get('/collection-cases?page=2&limit=10')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<CollectionCaseListItemResponse>
    >;

    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.data.items).toHaveLength(10);
    expect(body.data.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 35,
      totalPages: 4,
    });
    expect(body.data.items[0]?.id).toMatch(/^case_/);
  });

  it('GET /collection-cases aceita filtros em mock', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await api(httpServer)
      .get('/collection-cases?status=NO_RESPONSE&search=Horizonte')
      .expect(200);

    const body = response.body as ApiEnvelope<
      PaginatedResponse<CollectionCaseListItemResponse>
    >;

    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.items.every((item) => item.status === 'NO_RESPONSE')).toBe(
      true,
    );
    expect(
      body.data.items.every((item) => item.customerName.includes('Horizonte')),
    ).toBe(true);
  });

  it('GET /collection-cases rejeita sortBy invalido', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .get('/collection-cases?sortBy=invalidField')
      .expect(400);
  });

  it('GET /collection-cases/:id retorna detalhe', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await api(httpServer)
      .get('/collection-cases/case_0001')
      .expect(200);

    const body = response.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.data.id).toBe('case_0001');
    expect(body.data.customer.name).toBe('Construtora Horizonte');
    expect(body.data.contract.code).toBe('CTR-10428');
    expect(body.data.outstandingAmount).toBe('12890.55');
    expect(body.data.recentAttempts.length).toBeGreaterThan(0);
  });

  it('GET /collection-cases/:id retorna 404 para id inexistente', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer).get('/collection-cases/case_inexistente').expect(404);
  });

  it('PATCH /collection-cases/:id/assign atribui responsavel em mock', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await api(httpServer)
      .patch('/collection-cases/case_0001/assign')
      .send({ assignedUserId: 'usr_carlos' })
      .expect(200);

    const body = response.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    expect(body.data.assignedTo).toEqual({
      id: 'usr_carlos',
      name: 'Carlos Nunes',
    });
  });

  it('PATCH /collection-cases/:id/assign remove responsavel com null', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await api(httpServer)
      .patch('/collection-cases/case_0001/assign')
      .send({ assignedUserId: null })
      .expect(200);

    const body = response.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    expect(body.data.assignedTo).toBeNull();
  });

  it('PATCH /collection-cases/:id/assign retorna 404 para caso inexistente', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .patch('/collection-cases/case_inexistente/assign')
      .send({ assignedUserId: 'usr_carlos' })
      .expect(404);
  });

  it('POST /collection-cases/:id/attempts cria tentativa em mock', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await api(httpServer)
      .post('/collection-cases/case_0001/attempts')
      .send({
        channel: 'WHATSAPP',
        result: 'CONTACTED',
        notes: 'Cliente respondeu no WhatsApp.',
      })
      .expect(201);

    const body = response.body as ApiEnvelope<CollectionAttemptResponse>;

    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.data.collectionCaseId).toBe('case_0001');
    expect(body.data.channel).toBe('WHATSAPP');
    expect(body.data.result).toBe('CONTACTED');
    expect(body.data.notes).toBe('Cliente respondeu no WhatsApp.');

    const detailResponse = await api(httpServer)
      .get('/collection-cases/case_0001')
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    expect(
      detailBody.data.attempts.some((attempt) => attempt.id === body.data.id),
    ).toBe(true);

    expect(mockAuditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'COLLECTION_CASE',
          entityId: 'case_0001',
          action: 'CREATE',
        }),
      ]),
    );
  });

  it('POST /collection-cases/:id/attempts retorna 404 para caso inexistente', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_inexistente/attempts')
      .send({
        channel: 'PHONE',
        result: 'NO_ANSWER',
      })
      .expect(404);
  });

  it('POST /collection-cases/:id/attempts rejeita enum invalido', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_0001/attempts')
      .send({
        channel: 'INVALID_CHANNEL',
        result: 'CONTACTED',
      })
      .expect(400);
  });

  it('POST /collection-cases/:id/attempts salva e retorna nextContactAt no detalhe', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const nextContactAt = '2026-06-20T15:30:00.000Z';

    const response = await api(httpServer)
      .post('/collection-cases/case_0002/attempts')
      .send({
        channel: 'PHONE',
        result: 'CALLBACK_REQUESTED',
        nextContactAt,
      })
      .expect(201);

    const body = response.body as ApiEnvelope<CollectionAttemptResponse>;

    expect(body.data.nextContactAt).toBe(nextContactAt);

    const detailResponse = await api(httpServer)
      .get('/collection-cases/case_0002')
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    const createdAttempt = detailBody.data.attempts.find(
      (attempt) => attempt.id === body.data.id,
    );

    expect(createdAttempt?.nextContactAt).toBe(nextContactAt);
  });

  it('POST /collection-cases/:id/attempts rejeita notes acima do limite', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_0001/attempts')
      .send({
        channel: 'PHONE',
        result: 'NO_ANSWER',
        notes: 'a'.repeat(1001),
      })
      .expect(400);
  });

  it('POST /collection-cases/:id/promises cria promessa em mock', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const promisedDate = '2026-07-15T00:00:00.000Z';

    const response = await api(httpServer)
      .post('/collection-cases/case_0001/promises')
      .send({
        promisedAmount: 2500.75,
        promisedDate,
        notes: 'Acordo via telefone.',
      })
      .expect(201);

    const body = response.body as ApiEnvelope<PaymentPromiseResponse>;

    expect(body.data.collectionCaseId).toBe('case_0001');
    expect(body.data.promisedAmount).toBe('2500.75');
    expect(body.data.promisedDate).toBe(promisedDate);
    expect(body.data.notes).toBe('Acordo via telefone.');
    expect(body.data.status).toBe('ACTIVE');

    const detailResponse = await api(httpServer)
      .get('/collection-cases/case_0001')
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    expect(
      detailBody.data.promises.some((promise) => promise.id === body.data.id),
    ).toBe(true);

    const promiseAudit = mockAuditLogs.find(
      (entry) =>
        entry.entityId === 'case_0001' &&
        entry.metadata.resourceType === 'PAYMENT_PROMISE',
    );

    expect(promiseAudit).toBeDefined();
    expect(promiseAudit?.action).toBe('CREATE');
  });

  it('POST /collection-cases/:id/promises retorna 404 para caso inexistente', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_inexistente/promises')
      .send({
        promisedAmount: 100,
        promisedDate: '2026-07-01T00:00:00.000Z',
      })
      .expect(404);
  });

  it('POST /collection-cases/:id/promises rejeita promisedAmount <= 0', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_0001/promises')
      .send({
        promisedAmount: 0,
        promisedDate: '2026-07-01T00:00:00.000Z',
      })
      .expect(400);
  });

  it('POST /collection-cases/:id/promises rejeita promisedDate invalida', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_0001/promises')
      .send({
        promisedAmount: 100,
        promisedDate: 'data-invalida',
      })
      .expect(400);
  });

  it('POST /collection-cases/:id/promises rejeita notes acima do limite', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_0001/promises')
      .send({
        promisedAmount: 100,
        promisedDate: '2026-07-01T00:00:00.000Z',
        notes: 'a'.repeat(1001),
      })
      .expect(400);
  });

  async function createActivePromise(
    httpServer: Parameters<typeof request>[0],
  ) {
    const response = await api(httpServer)
      .post('/collection-cases/case_0001/promises')
      .send({
        promisedAmount: 1800,
        promisedDate: '2026-08-10T00:00:00.000Z',
        notes: 'Promessa para gestao de status.',
      })
      .expect(201);

    const body = response.body as ApiEnvelope<PaymentPromiseResponse>;

    return body.data;
  }

  it('POST fulfill muda ACTIVE para FULFILLED', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const promise = await createActivePromise(httpServer);

    const fulfillResponse = await api(httpServer)
      .post(`/collection-cases/case_0001/promises/${promise.id}/fulfill`)
      .send({ notes: 'Pagamento recebido.' })
      .expect(201);

    const fulfillBody =
      fulfillResponse.body as ApiEnvelope<PaymentPromiseResponse>;

    expect(fulfillBody.data.status).toBe('FULFILLED');
    expect(fulfillBody.data.fulfilledAt).toEqual(expect.any(String));

    const detailResponse = await api(httpServer)
      .get('/collection-cases/case_0001')
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;
    const updatedPromise = detailBody.data.promises.find(
      (item) => item.id === promise.id,
    );

    expect(updatedPromise?.status).toBe('FULFILLED');

    const statusAudit = mockAuditLogs.find(
      (entry) =>
        entry.entityId === 'case_0001' &&
        entry.action === 'STATUS_CHANGE' &&
        entry.metadata.action === 'FULFILLED',
    );

    expect(statusAudit).toBeDefined();
  });

  it('POST break muda ACTIVE para BROKEN', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const promise = await createActivePromise(httpServer);

    const breakResponse = await api(httpServer)
      .post(`/collection-cases/case_0001/promises/${promise.id}/break`)
      .send({})
      .expect(201);

    const breakBody = breakResponse.body as ApiEnvelope<PaymentPromiseResponse>;

    expect(breakBody.data.status).toBe('BROKEN');
    expect(breakBody.data.brokenAt).toEqual(expect.any(String));
  });

  it('POST cancel muda ACTIVE para CANCELLED', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const promise = await createActivePromise(httpServer);

    const cancelResponse = await api(httpServer)
      .post(`/collection-cases/case_0001/promises/${promise.id}/cancel`)
      .send({})
      .expect(201);

    const cancelBody =
      cancelResponse.body as ApiEnvelope<PaymentPromiseResponse>;

    expect(cancelBody.data.status).toBe('CANCELLED');
    expect(cancelBody.data.cancelledAt).toEqual(expect.any(String));
  });

  it('POST fulfill retorna 404 para promessa inexistente', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_0001/promises/prm_inexistente/fulfill')
      .send({})
      .expect(404);
  });

  it('POST fulfill retorna 404 para promessa de outro caso', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const promise = await createActivePromise(httpServer);

    await api(httpServer)
      .post(`/collection-cases/case_0002/promises/${promise.id}/fulfill`)
      .send({})
      .expect(404);
  });

  it('POST break retorna 409 para promessa ja FULFILLED', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const promise = await createActivePromise(httpServer);

    await api(httpServer)
      .post(`/collection-cases/case_0001/promises/${promise.id}/fulfill`)
      .send({})
      .expect(201);

    await api(httpServer)
      .post(`/collection-cases/case_0001/promises/${promise.id}/break`)
      .send({})
      .expect(409);
  });

  it('POST cancel retorna 409 para promessa ja BROKEN', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const promise = await createActivePromise(httpServer);

    await api(httpServer)
      .post(`/collection-cases/case_0001/promises/${promise.id}/break`)
      .send({})
      .expect(201);

    await api(httpServer)
      .post(`/collection-cases/case_0001/promises/${promise.id}/cancel`)
      .send({})
      .expect(409);
  });

  it('GET /collection-cases/:id/timeline retorna eventos consolidados', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_0001/attempts')
      .send({
        channel: 'PHONE',
        result: 'CONTACTED',
        notes: 'Timeline - tentativa registrada.',
      })
      .expect(201);

    const promise = await createActivePromise(httpServer);

    await api(httpServer)
      .post(`/collection-cases/case_0001/promises/${promise.id}/fulfill`)
      .send({})
      .expect(201);

    const response = await api(httpServer)
      .get('/collection-cases/case_0001/timeline')
      .expect(200);

    const body = response.body as ApiEnvelope<CollectionCaseTimelineResponse>;

    expect(body.data.caseId).toBe('case_0001');
    expect(
      body.data.events.some((event) => event.type === 'CASE_CREATED'),
    ).toBe(true);
    expect(
      body.data.events.some((event) => event.type === 'ATTEMPT_CREATED'),
    ).toBe(true);
    expect(
      body.data.events.some(
        (event) => event.type === 'PAYMENT_PROMISE_CREATED',
      ),
    ).toBe(true);
    expect(
      body.data.events.some(
        (event) => event.type === 'PAYMENT_PROMISE_FULFILLED',
      ),
    ).toBe(true);

    const timestamps = body.data.events.map((event) =>
      new Date(event.occurredAt).getTime(),
    );

    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it('GET /collection-cases/:id/timeline retorna 404 para caso inexistente', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .get('/collection-cases/case_inexistente/timeline')
      .expect(404);
  });

  it('POST send-to-cancellation encaminha caso com sucesso', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await api(httpServer)
      .post('/collection-cases/case_0001/send-to-cancellation')
      .send({
        reason: 'Cliente recusou acordo de pagamento.',
        notes: 'Encaminhado apos tentativas sem sucesso.',
        assignedUserId: 'user-cancellation',
      })
      .expect(201);

    const body = response.body as ApiEnvelope<{
      id: string;
      collectionCaseId: string;
      status: string;
      reason: string;
    }>;

    expect(body.data.collectionCaseId).toBe('case_0001');
    expect(body.data.status).toBe('PENDING');
    expect(body.data.reason).toBe('Cliente recusou acordo de pagamento.');

    const detailResponse = await api(httpServer)
      .get('/collection-cases/case_0001')
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    expect(detailBody.data.status).toBe('CANCELLATION_IN_PROGRESS');
    expect(detailBody.data.cancellationProcess?.id).toBe(body.data.id);

    const timelineResponse = await api(httpServer)
      .get('/collection-cases/case_0001/timeline')
      .expect(200);

    const timelineBody =
      timelineResponse.body as ApiEnvelope<CollectionCaseTimelineResponse>;

    expect(
      timelineBody.data.events.some(
        (event) => event.type === 'CASE_SENT_TO_CANCELLATION',
      ),
    ).toBe(true);

    const cancellationAudit = mockAuditLogs.find(
      (entry) =>
        entry.entityId === 'case_0001' &&
        entry.metadata.resourceType === 'CANCELLATION_PROCESS',
    );

    expect(cancellationAudit).toBeDefined();
  });

  it('POST send-to-cancellation retorna 404 para caso inexistente', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_inexistente/send-to-cancellation')
      .send({ reason: 'Motivo valido.', assignedUserId: 'user-cancellation' })
      .expect(404);
  });

  it('POST send-to-cancellation retorna 409 para caso ja encaminhado', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_0002/send-to-cancellation')
      .send({ reason: 'Primeiro encaminhamento.', assignedUserId: 'user-cancellation' })
      .expect(201);

    await api(httpServer)
      .post('/collection-cases/case_0002/send-to-cancellation')
      .send({ reason: 'Segundo encaminhamento.', assignedUserId: 'user-cancellation' })
      .expect(409);
  });

  it('POST send-to-cancellation retorna 409 para caso recuperado', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await api(httpServer)
      .post('/collection-cases/case_recovered/send-to-cancellation')
      .send({ reason: 'Tentativa invalida.', assignedUserId: 'user-cancellation' })
      .expect(409);
  });
});
