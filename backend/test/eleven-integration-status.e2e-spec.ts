import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import { authHeader, loginAsAdmin } from './helpers/auth-test.helper';

type ApiEnvelope<TData> = {
  data: TData;
  timestamp: string;
};

type ElevenStatusPayload = {
  mode: string;
  available: boolean;
  message: string;
};

describe('Eleven integration status (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

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

  it('GET /integrations/eleven/status retorna stub disponivel por padrao', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/integrations/eleven/status')
      .set(authHeader(adminToken))
      .expect(200);

    const body = response.body as ApiEnvelope<ElevenStatusPayload>;

    expect(body.data.mode).toBe('stub');
    expect(body.data.available).toBe(true);
    expect(body.data.message).toBe('Integração Eleven em modo simulado.');
  });

  it('GET /integrations/eleven/status nao expoe segredos', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/integrations/eleven/status')
      .set(authHeader(adminToken))
      .expect(200);

    const body = response.body as ApiEnvelope<ElevenStatusPayload>;

    expect(Object.keys(body.data)).toEqual(['mode', 'available', 'message']);
    expect(body.data).not.toHaveProperty('apiKey');
    expect(body.data).not.toHaveProperty('secret');
    expect(body.data).not.toHaveProperty('password');
    expect(body.data).not.toHaveProperty('url');
  });

  it('GET /integrations/eleven/status exige autenticacao', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer).get('/integrations/eleven/status').expect(401);
  });
});

describe('Eleven integration status disabled (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
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
    adminToken = (await loginAsAdmin(httpServer)).accessToken;
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

  it('GET /integrations/eleven/status retorna disabled indisponivel', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/integrations/eleven/status')
      .set(authHeader(adminToken))
      .expect(200);

    const body = response.body as ApiEnvelope<ElevenStatusPayload>;

    expect(body.data.mode).toBe('disabled');
    expect(body.data.available).toBe(false);
    expect(body.data.message).toBe('Integração Eleven desabilitada.');
  });
});

describe('Eleven integration status live (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  const previousElevenMode = process.env.ELEVEN_MODE;

  beforeAll(async () => {
    process.env.ELEVEN_MODE = 'live';

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
    if (previousElevenMode === undefined) {
      delete process.env.ELEVEN_MODE;
    } else {
      process.env.ELEVEN_MODE = previousElevenMode;
    }

    if (app) {
      await app.close();
    }
  });

  it('GET /integrations/eleven/status retorna live disponivel', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/integrations/eleven/status')
      .set(authHeader(adminToken))
      .expect(200);

    const body = response.body as ApiEnvelope<ElevenStatusPayload>;

    expect(body.data.mode).toBe('live');
    expect(body.data.available).toBe(true);
    expect(body.data.message).toBe('Integração Eleven ativa.');
  });
});
