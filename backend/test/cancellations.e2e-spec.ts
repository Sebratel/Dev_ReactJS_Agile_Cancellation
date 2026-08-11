import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import type { CollectionCaseDetailsResponse } from '@/modules/collection-cases/dto/collection-case-details.response';
import type { CollectionCaseTimelineResponse } from '@/modules/collection-cases/dto/collection-case-timeline.response';
import { COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED } from '@/modules/cancellations/constants/collection-case-closure.constants';
import { DEFAULT_CANCELLATION_STEP_DEFINITIONS } from '@/modules/cancellations/constants/default-cancellation-steps.constants';
import {
  mockAuditLogs,
  resetMockCollectionCases,
} from '@/modules/collection-cases/mocks/collection-cases.mock';
import {
  authHeader,
  loginAsAdmin,
  loginAsCancellationAgent,
  loginAsFinance,
  loginAsSupervisor,
  loginAsViewer,
} from './helpers/auth-test.helper';
import { buildElevenStubProtocol } from '@/modules/integrations/eleven/eleven-stub.provider';
import { getApiErrorCode } from './helpers/api-error-test.helper';

type ApiEnvelope<TData> = {
  data: TData;
  timestamp: string;
};

describe('Cancellations (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let financeToken: string;
  let cancellationAgentToken: string;
  let supervisorToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    adminToken = (await loginAsAdmin(httpServer)).accessToken;
    financeToken = (await loginAsFinance(httpServer)).accessToken;
    cancellationAgentToken = (await loginAsCancellationAgent(httpServer))
      .accessToken;
    supervisorToken = (await loginAsSupervisor(httpServer)).accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    resetMockCollectionCases();
  });

  async function createCancellationProcess(
    httpServer: Parameters<typeof request>[0],
  ) {
    const response = await request(httpServer)
      .post('/collection-cases/case_0001/send-to-cancellation')
      .set(authHeader(adminToken))
      .send({ reason: 'Encaminhamento para testes de etapas.' })
      .expect(201);

    const body = response.body as ApiEnvelope<{ id: string }>;

    return body.data.id;
  }

  it('POST send-to-cancellation cria etapas padrao', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    const detailResponse = await request(httpServer)
      .get('/collection-cases/case_0001')
      .set(authHeader(adminToken))
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    expect(detailBody.data.cancellationProcess?.steps).toHaveLength(
      DEFAULT_CANCELLATION_STEP_DEFINITIONS.length,
    );
    expect(detailBody.data.cancellationProcess?.steps[0]?.stepCode).toBe(
      'LOWER_TITLES',
    );
    expect(detailBody.data.cancellationProcess?.steps[0]?.status).toBe(
      'PENDING',
    );

    const firstStepCode = DEFAULT_CANCELLATION_STEP_DEFINITIONS[0]?.stepCode;

    expect(firstStepCode).toBeDefined();

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/${firstStepCode}/complete`)
      .set(authHeader(financeToken))
      .send({ notes: 'Titulos baixados.' })
      .expect(201);
  });

  it('POST complete step conclui etapa e registra auditoria', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    const response = await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .set(authHeader(financeToken))
      .send({
        notes: 'Titulos baixados.',
        externalProtocol: 'PROT-001',
      })
      .expect(201);

    const body = response.body as ApiEnvelope<{
      stepCode: string;
      status: string;
      externalProtocol: string | null;
    }>;

    expect(body.data.stepCode).toBe('LOWER_TITLES');
    expect(body.data.status).toBe('COMPLETED');
    expect(body.data.externalProtocol).toBe('PROT-001');

    const detailResponse = await request(httpServer)
      .get('/collection-cases/case_0001')
      .set(authHeader(adminToken))
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    const step = detailBody.data.cancellationProcess?.steps.find(
      (item) => item.stepCode === 'LOWER_TITLES',
    );

    expect(step?.status).toBe('COMPLETED');
    expect(step?.completedByName).toBe('Carla Mendes');

    const stepAudit = mockAuditLogs.find(
      (entry) =>
        entry.metadata.resourceType === 'CANCELLATION_STEP' &&
        entry.metadata.stepCode === 'LOWER_TITLES',
    );

    expect(stepAudit).toBeDefined();
  });

  it('POST complete step retorna 404 para etapa inexistente', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/STEP_INEXISTENTE/complete`)
      .set(authHeader(cancellationAgentToken))
      .send({})
      .expect(404);
  });

  it('POST complete step retorna 409 para etapa ja concluida', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .set(authHeader(financeToken))
      .send({})
      .expect(201);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .set(authHeader(financeToken))
      .send({})
      .expect(409);
  });

  it('concluir todas etapas finaliza processo e atualiza caso', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await completeStepsBeforeEleven(httpServer, cancellationId);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .set(authHeader(cancellationAgentToken))
      .send({})
      .expect(201);

    for (const step of DEFAULT_CANCELLATION_STEP_DEFINITIONS.filter(
      (item) =>
        item.stepCode !== 'LOWER_TITLES' &&
        item.stepCode !== 'APPLY_FINE' &&
        item.stepCode !== 'OPEN_ELEVEN_REQUEST',
    )) {
      await request(httpServer)
        .post(
          `/cancellations/${cancellationId}/steps/${step.stepCode}/complete`,
        )
        .set(authHeader(cancellationAgentToken))
        .send({})
        .expect(201);
    }

    const detailResponse = await request(httpServer)
      .get('/collection-cases/case_0001')
      .set(authHeader(adminToken))
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

    const timelineResponse = await request(httpServer)
      .get('/collection-cases/case_0001/timeline')
      .set(authHeader(adminToken))
      .expect(200);

    const timelineBody =
      timelineResponse.body as ApiEnvelope<CollectionCaseTimelineResponse>;

    expect(
      timelineBody.data.events.some(
        (event) => event.type === 'CANCELLATION_STEP_COMPLETED',
      ),
    ).toBe(true);
    expect(
      timelineBody.data.events.some(
        (event) => event.type === 'CANCELLATION_PROCESS_COMPLETED',
      ),
    ).toBe(true);
  });

  async function completeStepsBeforeEleven(
    httpServer: Parameters<typeof request>[0],
    cancellationId: string,
  ) {
    const stepsBeforeEleven = DEFAULT_CANCELLATION_STEP_DEFINITIONS.filter(
      (step) => step.stepCode !== 'OPEN_ELEVEN_REQUEST',
    ).slice(0, 2);

    for (const step of stepsBeforeEleven) {
      await request(httpServer)
        .post(
          `/cancellations/${cancellationId}/steps/${step.stepCode}/complete`,
        )
        .set(authHeader(financeToken))
        .send({})
        .expect(201);
    }
  }

  it('POST eleven/request gera protocolo stub e conclui OPEN_ELEVEN_REQUEST', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await completeStepsBeforeEleven(httpServer, cancellationId);

    const response = await request(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .set(authHeader(cancellationAgentToken))
      .send({ notes: 'Abertura Eleven via stub.' })
      .expect(201);

    const body = response.body as ApiEnvelope<{
      protocol: string;
      step: {
        stepCode: string;
        status: string;
        externalProtocol: string | null;
      };
    }>;

    const expectedProtocol = buildElevenStubProtocol(cancellationId);

    expect(body.data.protocol).toBe(expectedProtocol);
    expect(body.data.protocol).toMatch(/^ELEVEN-STUB-\d{8}-[A-F0-9]{4}$/);
    expect(body.data.step.stepCode).toBe('OPEN_ELEVEN_REQUEST');
    expect(body.data.step.status).toBe('COMPLETED');
    expect(body.data.step.externalProtocol).toBe(expectedProtocol);

    const detailResponse = await request(httpServer)
      .get('/collection-cases/case_0001')
      .set(authHeader(adminToken))
      .expect(200);

    const detailBody =
      detailResponse.body as ApiEnvelope<CollectionCaseDetailsResponse>;

    const step = detailBody.data.cancellationProcess?.steps.find(
      (item) => item.stepCode === 'OPEN_ELEVEN_REQUEST',
    );

    expect(step?.status).toBe('COMPLETED');
    expect(step?.externalProtocol).toBe(expectedProtocol);
  });

  it('POST eleven/request cria AuditLog com metadata Eleven', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await completeStepsBeforeEleven(httpServer, cancellationId);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .set(authHeader(cancellationAgentToken))
      .send({ notes: 'Auditoria Eleven.' })
      .expect(201);

    const stepAudit = mockAuditLogs.find(
      (entry) =>
        entry.metadata.resourceType === 'CANCELLATION_STEP' &&
        entry.metadata.stepCode === 'OPEN_ELEVEN_REQUEST' &&
        entry.metadata.integration === 'ELEVEN',
    );

    expect(stepAudit).toBeDefined();
    expect(stepAudit?.metadata.action).toBe('CREATE_REQUEST');
  });

  it('POST eleven/request retorna 404 para cancellation inexistente', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post('/cancellations/can_inexistente/eleven/request')
      .set(authHeader(cancellationAgentToken))
      .send({})
      .expect(404);
  });

  it('POST eleven/request retorna 409 se etapa ja concluida', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await completeStepsBeforeEleven(httpServer, cancellationId);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .set(authHeader(cancellationAgentToken))
      .send({})
      .expect(201);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .set(authHeader(cancellationAgentToken))
      .send({})
      .expect(409);
  });

  it('POST eleven/request retorna 403 para perfil sem permissao', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);
    const viewer = await loginAsViewer(httpServer);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .set(authHeader(viewer.accessToken))
      .send({})
      .expect(403);
  });

  it('POST complete step retorna 409 step_out_of_order fora de sequencia', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    const response = await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/APPLY_FINE/complete`)
      .set(authHeader(financeToken))
      .send({})
      .expect(409);

    expect(getApiErrorCode(response.body)).toBe('step_out_of_order');
  });

  it('POST complete step bloqueia OPEN_ELEVEN_REQUEST via endpoint generico', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await completeStepsBeforeEleven(httpServer, cancellationId);

    const response = await request(httpServer)
      .post(
        `/cancellations/${cancellationId}/steps/OPEN_ELEVEN_REQUEST/complete`,
      )
      .set(authHeader(cancellationAgentToken))
      .send({})
      .expect(409);

    expect(getApiErrorCode(response.body)).toBe('step_requires_integration');
  });

  it('POST complete step retorna 403 step_permission_denied para role inadequada', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    const response = await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .set(authHeader(cancellationAgentToken))
      .send({})
      .expect(403);

    expect(getApiErrorCode(response.body)).toBe('step_permission_denied');
  });

  it('POST complete step permite admin concluir etapa financeira', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .set(authHeader(adminToken))
      .send({})
      .expect(201);
  });

  it('POST complete step permite supervisor concluir etapa financeira', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .set(authHeader(supervisorToken))
      .send({})
      .expect(201);
  });

  it('POST complete step bloqueia alteracoes quando processo concluido', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await completeStepsBeforeEleven(httpServer, cancellationId);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .set(authHeader(cancellationAgentToken))
      .send({})
      .expect(201);

    for (const step of DEFAULT_CANCELLATION_STEP_DEFINITIONS.filter(
      (item) =>
        item.stepCode !== 'LOWER_TITLES' &&
        item.stepCode !== 'APPLY_FINE' &&
        item.stepCode !== 'OPEN_ELEVEN_REQUEST',
    )) {
      await request(httpServer)
        .post(
          `/cancellations/${cancellationId}/steps/${step.stepCode}/complete`,
        )
        .set(authHeader(adminToken))
        .send({})
        .expect(201);
    }

    const response = await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/ROUTE_PROTOCOL/complete`)
      .set(authHeader(adminToken))
      .send({})
      .expect(409);

    expect(getApiErrorCode(response.body)).toBe(
      'cancellation_already_completed',
    );
  });
});

describe('Cancellations Eleven disabled (e2e)', () => {
  let app: INestApplication;
  let cancellationAgentToken: string;
  const previousElevenMode = process.env.ELEVEN_MODE;

  beforeAll(async () => {
    process.env.ELEVEN_MODE = 'disabled';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    cancellationAgentToken = (await loginAsCancellationAgent(httpServer))
      .accessToken;
  });

  afterAll(async () => {
    if (previousElevenMode === undefined) {
      delete process.env.ELEVEN_MODE;
    } else {
      process.env.ELEVEN_MODE = previousElevenMode;
    }

    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    resetMockCollectionCases();
  });

  async function createCancellationProcess(
    httpServer: Parameters<typeof request>[0],
  ) {
    const adminToken = (await loginAsAdmin(httpServer)).accessToken;
    const response = await request(httpServer)
      .post('/collection-cases/case_0001/send-to-cancellation')
      .set(authHeader(adminToken))
      .send({ reason: 'Teste Eleven disabled.' })
      .expect(201);

    const body = response.body as ApiEnvelope<{ id: string }>;

    return body.data.id;
  }

  async function completeStepsBeforeEleven(
    httpServer: Parameters<typeof request>[0],
    cancellationId: string,
  ) {
    const adminToken = (await loginAsAdmin(httpServer)).accessToken;

    for (const stepCode of ['LOWER_TITLES', 'APPLY_FINE'] as const) {
      await request(httpServer)
        .post(`/cancellations/${cancellationId}/steps/${stepCode}/complete`)
        .set(authHeader(adminToken))
        .send({})
        .expect(201);
    }
  }

  it('POST eleven/request retorna 503 quando ELEVEN_MODE=disabled', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await completeStepsBeforeEleven(httpServer, cancellationId);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .set(authHeader(cancellationAgentToken))
      .send({})
      .expect(503);
  });

  it('POST complete step bloqueia OPEN_ELEVEN_REQUEST generico quando disabled', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const cancellationId = await createCancellationProcess(httpServer);

    await completeStepsBeforeEleven(httpServer, cancellationId);

    const response = await request(httpServer)
      .post(
        `/cancellations/${cancellationId}/steps/OPEN_ELEVEN_REQUEST/complete`,
      )
      .set(authHeader(cancellationAgentToken))
      .send({})
      .expect(409);

    expect(getApiErrorCode(response.body)).toBe('step_requires_integration');
  });
});
