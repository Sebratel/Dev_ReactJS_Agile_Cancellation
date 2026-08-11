import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import {
  authHeader,
  loginAsAdmin,
  loginAsCollectionAgent,
} from './helpers/auth-test.helper';

describe('Customers (e2e)', () => {
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

  function server() {
    return app.getHttpServer() as Parameters<typeof request>[0];
  }

  it('exige autenticacao (401)', async () => {
    await request(server()).get('/customers').expect(401);
  });

  it('COLLECTION_AGENT nao acessa /customers (403)', async () => {
    await request(server())
      .get('/customers')
      .set(authHeader(collectionAgentToken))
      .expect(403);
  });

  it('ADMIN lista clientes (200)', async () => {
    const response = await request(server())
      .get('/customers?page=1&limit=10')
      .set(authHeader(adminToken))
      .expect(200);

    const body = response.body as {
      data: { items: unknown[]; pagination: { page: number } };
    };

    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.pagination.page).toBe(1);
  });

  it('ADMIN busca detalhe com historico (200)', async () => {
    const response = await request(server())
      .get('/customers/cus_0001')
      .set(authHeader(adminToken))
      .expect(200);

    const body = response.body as {
      data: { paymentHistory: unknown[]; totalOutstanding: string };
    };

    expect(body.data.paymentHistory.length).toBeGreaterThan(0);
    expect(body.data.totalOutstanding).toBe('12890.55');
  });

  it('retorna 404 para cliente inexistente', async () => {
    await request(server())
      .get('/customers/cus_inexistente')
      .set(authHeader(adminToken))
      .expect(404);
  });
});
