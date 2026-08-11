import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { createGlobalValidationPipe } from '@/common/validation/validation-pipe.config';
import { WEBHOOK_SECRET_HEADER } from '@/modules/webhooks/guards/webhook-auth.guard';
import type { IngestCollectionCasesDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';

const SECRET =
  process.env.N8N_WEBHOOK_SECRET ?? 'test-webhook-secret-1234567890';
const ENDPOINT = '/webhooks/n8n/collection-cases';

function validPayload(): IngestCollectionCasesDto {
  return {
    source: 'n8n',
    events: [
      {
        externalId: 'wh-case-1',
        customer: { name: 'Fulano', document: '99988877700' },
        contract: { code: 'WH-CT-1', startDate: '2025-01-01T00:00:00.000Z' },
        invoices: [
          {
            externalId: 'wh-inv-1',
            dueDate: '2025-02-01T00:00:00.000Z',
            amount: 250,
          },
        ],
        case: { outstandingAmount: 250, daysOverdue: 65 },
      },
    ],
  };
}

describe('Webhooks N8N (e2e)', () => {
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
    await app.close();
  });

  function server() {
    return app.getHttpServer() as Parameters<typeof request>[0];
  }

  it('rejeita sem o header de segredo (401)', async () => {
    await request(server()).post(ENDPOINT).send(validPayload()).expect(401);
  });

  it('rejeita com segredo inválido (401)', async () => {
    await request(server())
      .post(ENDPOINT)
      .set(WEBHOOK_SECRET_HEADER, 'errado')
      .send(validPayload())
      .expect(401);
  });

  it('rejeita payload inválido (400)', async () => {
    await request(server())
      .post(ENDPOINT)
      .set(WEBHOOK_SECRET_HEADER, SECRET)
      .send({ events: [] })
      .expect(400);
  });

  it('aceita payload válido com segredo correto (202) e retorna resumo', async () => {
    const response = await request(server())
      .post(ENDPOINT)
      .set(WEBHOOK_SECRET_HEADER, SECRET)
      .send(validPayload())
      .expect(202);

    const body = response.body as {
      data: { received: number; casesUpserted: number };
    };

    expect(body.data.received).toBe(1);
    expect(body.data.casesUpserted).toBe(1);
  });

  it('aceita monthlyValue opcional no contrato (202)', async () => {
    const payload = validPayload();
    const [firstEvent] = payload.events;
    if (!firstEvent) {
      throw new Error('Payload de teste sem eventos.');
    }
    firstEvent.contract = {
      ...firstEvent.contract,
      monthlyValue: 99.9,
    };

    await request(server())
      .post(ENDPOINT)
      .set(WEBHOOK_SECRET_HEADER, SECRET)
      .send(payload)
      .expect(202);
  });

  it('rejeita campos desconhecidos no payload (400)', async () => {
    const payload = validPayload() as unknown as Record<string, unknown>;
    payload.unexpected = 'campo-extra';

    await request(server())
      .post(ENDPOINT)
      .set(WEBHOOK_SECRET_HEADER, SECRET)
      .send(payload)
      .expect(400);
  });
});
