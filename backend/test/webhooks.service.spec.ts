import { WebhooksService } from '@/modules/webhooks/webhooks.service';
import { WebhooksMockRepository } from '@/modules/webhooks/repositories/webhooks-mock.repository';
import type { IngestCollectionCasesDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';

function buildPayload(
  overrides?: Partial<IngestCollectionCasesDto>,
): IngestCollectionCasesDto {
  return {
    source: 'n8n',
    events: [
      {
        externalId: 'case-ext-1',
        customer: {
          name: 'Cliente Teste',
          document: '12345678900',
          email: 'cliente@teste.com',
        },
        contract: {
          code: 'CT-001',
          startDate: '2025-01-01T00:00:00.000Z',
          totalValue: 1000,
        },
        invoices: [
          {
            externalId: 'inv-ext-1',
            dueDate: '2025-02-01T00:00:00.000Z',
            amount: 500,
          },
        ],
        case: {
          outstandingAmount: 500,
          daysOverdue: 70,
        },
      },
    ],
    ...overrides,
  };
}

describe('WebhooksService (mock)', () => {
  let service: WebhooksService;

  beforeEach(() => {
    service = new WebhooksService(new WebhooksMockRepository());
  });

  it('ingere um lote e retorna o resumo', async () => {
    const response = await service.ingestCollectionCases(buildPayload());

    expect(response.data).toEqual({
      received: 1,
      customersUpserted: 1,
      contractsUpserted: 1,
      invoicesUpserted: 1,
      casesUpserted: 1,
      skipped: 0,
    });
  });

  it('é idempotente: reenvio do mesmo caso é contabilizado como skipped', async () => {
    const repository = new WebhooksMockRepository();
    service = new WebhooksService(repository);

    await service.ingestCollectionCases(buildPayload());
    const second = await service.ingestCollectionCases(buildPayload());

    expect(second.data.casesUpserted).toBe(0);
    expect(second.data.skipped).toBe(1);
  });

  it('aceita monthlyValue opcional no contrato', async () => {
    const payload = buildPayload();
    const [firstEvent] = payload.events;
    if (!firstEvent) {
      throw new Error('Payload de teste sem eventos.');
    }
    firstEvent.contract = {
      ...firstEvent.contract,
      monthlyValue: 99.9,
    };

    const response = await service.ingestCollectionCases(payload);

    expect(response.data.contractsUpserted).toBe(1);
  });

  it('usa "n8n" como source padrão quando não informado', async () => {
    const response = await service.ingestCollectionCases(
      buildPayload({ source: undefined }),
    );

    expect(response.data.received).toBe(1);
  });
});
