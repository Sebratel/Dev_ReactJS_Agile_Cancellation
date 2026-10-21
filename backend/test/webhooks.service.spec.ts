/* eslint-disable @typescript-eslint/unbound-method -- matchers do jest (expect.*) e mocks tipados como any */
import { WebhooksService } from '@/modules/webhooks/webhooks.service';
import { WebhooksMockRepository } from '@/modules/webhooks/repositories/webhooks-mock.repository';
import type { IngestCollectionCasesDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';
import type { NotificationsService } from '@/modules/notifications/notifications.service';

function createService(repository = new WebhooksMockRepository()) {
  const notificationsService = {
    notify: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;

  return {
    service: new WebhooksService(repository, notificationsService),
    notificationsService,
  };
}

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
    service = createService().service;
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
    service = createService(repository).service;

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

  it('registra retorno Matrix e notifica responsavel', async () => {
    const { service, notificationsService } = createService();

    const response = await service.recordMatrixReply({
      codAtendimento: '5081836',
      message: 'Cliente respondeu',
      receivedAt: '2026-08-11T20:00:00.000Z',
    });

    expect(response.data.outcome).toBe('success');
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_marina',
        type: 'MATRIX_REPLY',
        entityType: 'COLLECTION_CASE',
      }),
    );
  });

  it('nao duplica notificacao quando retorno Matrix ja foi processado', async () => {
    const { service, notificationsService } = createService();

    await service.recordMatrixReply({ codAtendimento: '5081836' });
    const second = await service.recordMatrixReply({ codAtendimento: '5081836' });

    expect(second.data.outcome).toBe('already_processed');
    expect(notificationsService.notify).toHaveBeenCalledTimes(1);
  });

  it('retorna case_not_found quando retorno Matrix nao possui identificador', async () => {
    const { service, notificationsService } = createService();

    const response = await service.recordMatrixReply({});

    expect(response.data.outcome).toBe('case_not_found');
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });
});
