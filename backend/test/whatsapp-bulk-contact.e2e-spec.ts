/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- matchers do jest (expect.*) e mocks tipados como any */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import { resetMockCollectionCases } from '@/modules/collection-cases/mocks/collection-cases.mock';
import { resetMockBulkContactJobs } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job-mock.repository';
import {
  authHeader,
  loginAsAdmin,
  loginAsCollectionAgent,
} from './helpers/auth-test.helper';

// Regressao: /bulk-contact-whatsapp precisa ter path proprio, fora de
// /collection-cases — quando estava aninhado la (`/collection-cases/bulk-
// contact-whatsapp`), o GET de 1 segmento colidia com o catch-all
// `GET /collection-cases/:id` do CollectionCasesController, e qual dos dois
// vencia dependia da ordem de registro dos modulos (fragil, e nesse caso o
// catch-all vencia, quebrando o historico de envios com um falso 404 de
// "caso nao encontrado"). Este teste sobe a aplicacao real (Nest + rotas
// HTTP de verdade) para pegar esse tipo de colisao, que um teste de unidade
// nao enxerga.
describe('Whatsapp bulk contact (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let collectionAgentToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    adminToken = (await loginAsAdmin(httpServer)).accessToken;
    collectionAgentToken = (await loginAsCollectionAgent(httpServer))
      .accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMockCollectionCases();
    resetMockBulkContactJobs();
  });

  function httpServer() {
    return app.getHttpServer() as Parameters<typeof request>[0];
  }

  it('GET /bulk-contact-whatsapp retorna a lista paginada, nao um 404 de caso', async () => {
    const response = await request(httpServer())
      .get('/bulk-contact-whatsapp')
      .set(authHeader(adminToken));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        pagination: expect.objectContaining({ page: 1, limit: 10 }),
      }),
    );
  });

  it('cria job por filtro e o historico passa a mostra-lo', async () => {
    const createResponse = await request(httpServer())
      .post('/bulk-contact-whatsapp/by-filter')
      .set(authHeader(adminToken))
      .send({ priority: 'HIGH' });

    expect(createResponse.status).toBe(201);
    const jobId = createResponse.body.data.id as string;
    expect(jobId).toBeTruthy();

    const getResponse = await request(httpServer())
      .get(`/bulk-contact-whatsapp/${jobId}`)
      .set(authHeader(adminToken));
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.id).toBe(jobId);

    const listResponse = await request(httpServer())
      .get('/bulk-contact-whatsapp')
      .set(authHeader(adminToken));
    expect(listResponse.status).toBe(200);
    expect(
      listResponse.body.data.items.some((job: { id: string }) => job.id === jobId),
    ).toBe(true);
  });

  it('bloqueia agente de cobranca (rota restrita a supervisor/admin)', async () => {
    const response = await request(httpServer())
      .get('/bulk-contact-whatsapp')
      .set(authHeader(collectionAgentToken));

    expect(response.status).toBe(403);
  });
});
