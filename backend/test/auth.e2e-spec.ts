import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import type {
  AuthUserResponse,
  LoginResponse,
} from '@/modules/auth/dto/auth.response';
import type { CollectionAttemptResponse } from '@/modules/collection-cases/dto/collection-attempt.response';
import {
  authHeader,
  loginAsAdmin,
  loginAsCancellationAgent,
  loginAsCollectionAgent,
  loginAsFinance,
  loginAsSupervisor,
  loginAsViewer,
  mockGoogleIdToken,
} from './helpers/auth-test.helper';
import {
  mockAuditLogs,
  resetMockCollectionCases,
} from '@/modules/collection-cases/mocks/collection-cases.mock';

type ApiEnvelope<TData> = {
  data: TData;
  timestamp: string;
};

// Atendente so age em caso atribuido a ele: o supervisor atribui antes.
async function assignCaseToCollectionAgent(
  httpServer: Parameters<typeof request>[0],
) {
  const supervisor = await loginAsSupervisor(httpServer);

  await request(httpServer)
    .patch('/collection-cases/case_0001/assign')
    .set(authHeader(supervisor.accessToken))
    .send({ assignedUserId: 'user-collection' })
    .expect(200);
}

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    resetMockCollectionCases();
  });

  it('POST /auth/google retorna accessToken e user para conta cadastrada', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(httpServer)
      .post('/auth/google')
      .send({ idToken: mockGoogleIdToken('admin@ger.local') })
      .expect(201);

    const body = response.body as ApiEnvelope<LoginResponse>;

    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.refreshToken).toEqual(expect.any(String));
    expect(body.data.user).toEqual(
      expect.objectContaining({
        id: 'user-admin',
        email: 'admin@ger.local',
        roles: ['ADMIN'],
      }),
    );
  });

  it('POST /auth/google retorna accessToken e refreshToken', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(httpServer)
      .post('/auth/google')
      .send({ idToken: mockGoogleIdToken('admin@ger.local') })
      .expect(201);

    const body = response.body as ApiEnvelope<LoginResponse>;

    expect(body.data.accessToken.length).toBeGreaterThan(10);
    expect(body.data.refreshToken.length).toBeGreaterThan(10);
    expect(body.data.refreshToken).toContain('user-admin:');
  });

  it('POST /auth/refresh retorna novos tokens', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const login = await loginAsAdmin(httpServer);

    const response = await request(httpServer)
      .post('/auth/refresh')
      .send({ refreshToken: login.refreshToken })
      .expect(201);

    const body = response.body as ApiEnvelope<{
      accessToken: string;
      refreshToken: string;
    }>;

    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.refreshToken).toEqual(expect.any(String));
    expect(body.data.refreshToken).not.toBe(login.refreshToken);
  });

  it('POST /auth/refresh invalida token antigo apos rotacao', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const login = await loginAsAdmin(httpServer);
    const oldRefreshToken = login.refreshToken;

    await request(httpServer)
      .post('/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(201);

    await request(httpServer)
      .post('/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(401);
  });

  it('POST /auth/refresh retorna 401 para token invalido', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post('/auth/refresh')
      .send({ refreshToken: 'user-admin:token-invalido' })
      .expect(401);
  });

  it('POST /auth/logout invalida refresh token', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const login = await loginAsAdmin(httpServer);

    await request(httpServer)
      .post('/auth/logout')
      .set(authHeader(login.accessToken))
      .send({ refreshToken: login.refreshToken })
      .expect(201);

    await request(httpServer)
      .post('/auth/refresh')
      .send({ refreshToken: login.refreshToken })
      .expect(401);
  });

  it('POST /auth/google retorna 401 com token mock invalido', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post('/auth/google')
      .send({ idToken: 'token-sem-o-prefixo-mock' })
      .expect(401);
  });

  it('POST /auth/google retorna 403 para e-mail sem usuario cadastrado', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post('/auth/google')
      .send({ idToken: mockGoogleIdToken('nao-cadastrado@ger.local') })
      .expect(403);
  });

  it('POST /auth/google retorna 401 para usuario inativo', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post('/auth/google')
      .send({ idToken: mockGoogleIdToken('inactive@ger.local') })
      .expect(401);
  });

  it('GET /auth/me retorna usuario autenticado', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const login = await loginAsAdmin(httpServer);

    const response = await request(httpServer)
      .get('/auth/me')
      .set(authHeader(login.accessToken))
      .expect(200);

    const body = response.body as ApiEnvelope<AuthUserResponse>;

    expect(body.data.email).toBe('admin@ger.local');
    expect(body.data.roles).toContain('ADMIN');
  });

  it('GET /dashboard/summary retorna 401 sem token', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer).get('/dashboard/summary').expect(401);
  });

  it('GET /dashboard/operations retorna 401 sem token', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer).get('/dashboard/operations').expect(401);
  });

  it('POST /collection-cases/:id/attempts retorna 403 para perfil sem permissao', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const viewer = await loginAsViewer(httpServer);

    await request(httpServer)
      .post('/collection-cases/case_0001/attempts')
      .set(authHeader(viewer.accessToken))
      .send({
        channel: 'PHONE',
        result: 'NO_ANSWER',
      })
      .expect(403);
  });

  it('POST attempts em caso de outro atendente retorna 403', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const agent = await loginAsCollectionAgent(httpServer);

    await request(httpServer)
      .post('/collection-cases/case_0001/attempts')
      .set(authHeader(agent.accessToken))
      .send({ channel: 'EMAIL', result: 'CONTACTED' })
      .expect(403);
  });

  it('POST attempts usa usuario autenticado no AuditLog', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const agent = await loginAsCollectionAgent(httpServer);
    await assignCaseToCollectionAgent(httpServer);

    await request(httpServer)
      .post('/collection-cases/case_0001/attempts')
      .set(authHeader(agent.accessToken))
      .send({
        channel: 'EMAIL',
        result: 'CONTACTED',
        notes: 'Contato por e-mail.',
      })
      .expect(201);

    expect(mockAuditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'COLLECTION_CASE',
          entityId: 'case_0001',
          performedByUserId: null,
        }),
      ]),
    );
  });

  it('POST send-to-cancellation bloqueia operador comum', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const agent = await loginAsCollectionAgent(httpServer);

    await request(httpServer)
      .post('/collection-cases/case_0001/send-to-cancellation')
      .set(authHeader(agent.accessToken))
      .send({
        reason: 'Tentativa sem permissao.',
        assignedUserId: 'user-cancellation',
      })
      .expect(403);
  });

  it('POST complete cancellation step permite CANCELLATION_AGENT', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const supervisor = await loginAsAdmin(httpServer);
    const finance = await loginAsFinance(httpServer);

    const sendResponse = await request(httpServer)
      .post('/collection-cases/case_0001/send-to-cancellation')
      .set(authHeader(supervisor.accessToken))
      .send({
        reason: 'Encaminhamento para teste de auth.',
        assignedUserId: 'user-cancellation',
      })
      .expect(201);

    const cancellationId = (sendResponse.body as ApiEnvelope<{ id: string }>)
      .data.id;

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/LOWER_TITLES/complete`)
      .set(authHeader(finance.accessToken))
      .send({})
      .expect(201);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/APPLY_FINE/complete`)
      .set(authHeader(finance.accessToken))
      .send({})
      .expect(201);

    const cancellationAgent = await loginAsCancellationAgent(httpServer);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/eleven/request`)
      .set(authHeader(cancellationAgent.accessToken))
      .send({ notes: 'Etapa Eleven pelo agente de cancelamento.' })
      .expect(201);

    await request(httpServer)
      .post(`/cancellations/${cancellationId}/steps/ROUTE_PROTOCOL/complete`)
      .set(authHeader(cancellationAgent.accessToken))
      .send({ notes: 'Etapa concluida pelo agente de cancelamento.' })
      .expect(201);
  });

  it('POST /auth/logout retorna sucesso com JWT', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const login = await loginAsAdmin(httpServer);

    const response = await request(httpServer)
      .post('/auth/logout')
      .set(authHeader(login.accessToken))
      .send({ refreshToken: login.refreshToken })
      .expect(201);

    const body = response.body as ApiEnvelope<{ success: true }>;
    expect(body.data.success).toBe(true);
  });
});

describe('Auth attempts response (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST attempts retorna payload da tentativa', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const agent = await loginAsCollectionAgent(httpServer);
    await assignCaseToCollectionAgent(httpServer);

    const response = await request(httpServer)
      .post('/collection-cases/case_0001/attempts')
      .set(authHeader(agent.accessToken))
      .send({
        channel: 'WHATSAPP',
        result: 'CONTACTED',
      })
      .expect(201);

    const body = response.body as ApiEnvelope<CollectionAttemptResponse>;
    expect(body.data.channel).toBe('WHATSAPP');
  });
});
