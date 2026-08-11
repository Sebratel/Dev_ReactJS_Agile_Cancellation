import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import type { DashboardOperationsResponse } from '@/modules/dashboard/dto/dashboard-operations.response';
import type { DashboardSummaryResponse } from '@/modules/dashboard/dto/dashboard-summary.response';
import { authHeader, loginAsAdmin } from './helpers/auth-test.helper';

type ApiEnvelope<TData> = {
  data: TData;
  timestamp: string;
};

describe('Dashboard summary (e2e)', () => {
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

  it('GET /dashboard/summary retorna contrato correto', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(httpServer)
      .get('/dashboard/summary')
      .set(authHeader(adminToken))
      .expect(200);

    const body = response.body as ApiEnvelope<DashboardSummaryResponse>;

    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.data.metrics.delinquentCustomers).toBe(128);
    expect(body.data.metrics.openAmount).toBe('184750.42');
    expect(body.data.metrics.inCollection).toBe(76);
    expect(body.data.metrics.eligibleForCancellation).toBe(21);
    expect(body.data.metrics.recoveredMonth).toBe('48320.90');
    expect(body.data.metrics.activePromises).toBe(34);
    expect(body.data.metrics.overduePromises).toBe(9);
    expect(body.data.metrics.cancellationsInProgress).toBe(15);
    expect(body.data.statusDistribution).toHaveLength(6);
    expect(body.data.recoveryTrend).toHaveLength(7);
    expect(body.data.operationalAlerts).toHaveLength(4);
  });

  it('GET /dashboard/operations retorna contrato correto', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(httpServer)
      .get('/dashboard/operations')
      .set(authHeader(adminToken))
      .expect(200);

    const body = response.body as ApiEnvelope<DashboardOperationsResponse>;

    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.data.collection.activeCases).toBe(186);
    expect(body.data.collection.newCasesToday).toBe(4);
    expect(body.data.promises.activePromises).toBe(34);
    expect(body.data.promises.fulfillmentRate).toBeCloseTo(58 / (58 + 14));
    expect(body.data.cancellations.inProgress).toBe(6);
    expect(body.data.cancellations.averageCompletionDays).toBe(5.2);
    expect(body.data.cancellations.mostBlockedStep).toEqual({
      stepCode: 'OPEN_ELEVEN_REQUEST',
      count: 9,
    });
    expect(body.data.financial.outstandingAmount).toBe('184750.42');
    expect(body.data.financial.cancelledAmount).toBe('31840.75');
  });
});
