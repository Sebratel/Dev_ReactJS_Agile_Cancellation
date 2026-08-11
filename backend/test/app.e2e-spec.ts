import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';

type HealthResponseBody = {
  status: string;
  service: string;
  timestamp: string;
};

describe('Healthcheck (e2e)', () => {
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

  it('GET /health retorna status ok', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(httpServer).get('/health').expect(200);
    const body = response.body as HealthResponseBody;

    expect(body.status).toBe('ok');
    expect(body.service).toBe('ger-collection-cancellation-api');
    expect(body.timestamp).toEqual(expect.any(String));
  });
});
