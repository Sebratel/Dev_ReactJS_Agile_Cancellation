import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import {
  authHeader,
  loginAsAdmin,
  loginAsViewer,
} from './helpers/auth-test.helper';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    adminToken = (await loginAsAdmin(httpServer)).accessToken;
    viewerToken = (await loginAsViewer(httpServer)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  function server() {
    return app.getHttpServer() as Parameters<typeof request>[0];
  }

  it('exige autenticacao (401)', async () => {
    await request(server()).get('/users').expect(401);
  });

  it('VIEWER nao acessa /users (403)', async () => {
    await request(server())
      .get('/users')
      .set(authHeader(viewerToken))
      .expect(403);
  });

  it('ADMIN lista usuarios paginados (200)', async () => {
    const response = await request(server())
      .get('/users?page=1&limit=5')
      .set(authHeader(adminToken))
      .expect(200);

    const body = response.body as {
      data: { items: unknown[]; pagination: { page: number; limit: number } };
    };

    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(5);
  });

  it('ADMIN cria usuario sem senha (201) e nao expoe campos sensiveis', async () => {
    const response = await request(server())
      .post('/users')
      .set(authHeader(adminToken))
      .send({
        email: 'e2e-novo@ger.local',
        name: 'E2E Novo',
        roles: ['COLLECTION_AGENT'],
      })
      .expect(201);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('passwordHash');
  });

  it('rejeita payload invalido (400)', async () => {
    await request(server())
      .post('/users')
      .set(authHeader(adminToken))
      .send({ email: 'invalido', name: '', roles: [] })
      .expect(400);
  });

  it('retorna 404 para usuario inexistente', async () => {
    await request(server())
      .get('/users/nao-existe')
      .set(authHeader(adminToken))
      .expect(404);
  });
});
