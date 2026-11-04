/* eslint-disable @typescript-eslint/unbound-method -- matchers do jest (expect.*) e mocks tipados como any */
import { WhatsappBulkContactWorkerService } from '@/modules/whatsapp-bulk-contact/whatsapp-bulk-contact-worker.service';
import type { BulkContactJobRepository } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job.repository';
import type { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';

function createRepository(
  overrides: Partial<BulkContactJobRepository> = {},
): BulkContactJobRepository {
  return {
    createJob: jest.fn(),
    getJob: jest.fn(),
    listJobs: jest.fn(),
    getPendingItems: jest.fn().mockResolvedValue([]),
    recordItemResult: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('WhatsappBulkContactWorkerService', () => {
  it('nao faz nada quando nao ha itens pendentes', async () => {
    const recordItemResult = jest.fn();
    const repository = createRepository({ recordItemResult });
    const collectionCasesService = {
      attemptWhatsAppContact: jest.fn(),
    } as unknown as CollectionCasesService;

    const worker = new WhatsappBulkContactWorkerService(
      repository,
      collectionCasesService,
    );

    await worker.tick();

    expect(
      collectionCasesService.attemptWhatsAppContact,
    ).not.toHaveBeenCalled();
    expect(recordItemResult).not.toHaveBeenCalled();
  });

  it('mapeia cada desfecho do envio individual para o status correto do item', async () => {
    const items = [
      {
        itemId: 'item_sent',
        jobId: 'job_1',
        collectionCaseId: 'case_sent',
        createdByUserId: 'usr_1',
      },
      {
        itemId: 'item_status',
        jobId: 'job_1',
        collectionCaseId: 'case_status',
        createdByUserId: 'usr_1',
      },
      {
        itemId: 'item_phone',
        jobId: 'job_1',
        collectionCaseId: 'case_phone',
        createdByUserId: 'usr_1',
      },
      {
        itemId: 'item_missing',
        jobId: 'job_1',
        collectionCaseId: 'case_missing',
        createdByUserId: 'usr_1',
      },
      {
        itemId: 'item_failed',
        jobId: 'job_1',
        collectionCaseId: 'case_failed',
        createdByUserId: 'usr_1',
      },
    ];
    const recordItemResult = jest.fn().mockResolvedValue(undefined);
    const repository = createRepository({
      getPendingItems: jest.fn().mockResolvedValue(items),
      recordItemResult,
    });

    const outcomesByCase: Record<string, unknown> = {
      case_sent: { outcome: 'sent', result: { attemptId: 'att_1' } },
      case_status: { outcome: 'status_not_allowed', status: 'CLOSED' },
      case_phone: { outcome: 'no_phone' },
      case_missing: { outcome: 'case_not_found' },
      case_failed: { outcome: 'failed', error: new Error('timeout n8n') },
    };

    const collectionCasesService = {
      attemptWhatsAppContact: jest
        .fn()
        .mockImplementation((caseId: string) =>
          Promise.resolve(outcomesByCase[caseId]),
        ),
    } as unknown as CollectionCasesService;

    const worker = new WhatsappBulkContactWorkerService(
      repository,
      collectionCasesService,
    );

    await worker.tick();

    expect(recordItemResult).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'item_sent', status: 'SENT' }),
    );
    expect(recordItemResult).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'item_status',
        status: 'SKIPPED_STATUS',
      }),
    );
    expect(recordItemResult).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'item_phone',
        status: 'SKIPPED_PHONE',
      }),
    );
    expect(recordItemResult).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'item_missing', status: 'FAILED' }),
    );
    expect(recordItemResult).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'item_failed',
        status: 'FAILED',
        errorMessage: 'timeout n8n',
      }),
    );
  });

  it('marca como falho sem chamar o envio quando o item nao tem usuario responsavel', async () => {
    const recordItemResult = jest.fn().mockResolvedValue(undefined);
    const repository = createRepository({
      getPendingItems: jest.fn().mockResolvedValue([
        {
          itemId: 'item_1',
          jobId: 'job_1',
          collectionCaseId: 'case_1',
          createdByUserId: null,
        },
      ]),
      recordItemResult,
    });
    const collectionCasesService = {
      attemptWhatsAppContact: jest.fn(),
    } as unknown as CollectionCasesService;

    const worker = new WhatsappBulkContactWorkerService(
      repository,
      collectionCasesService,
    );

    await worker.tick();

    expect(
      collectionCasesService.attemptWhatsAppContact,
    ).not.toHaveBeenCalled();
    expect(recordItemResult).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'item_1', status: 'FAILED' }),
    );
  });

  it('ignora um novo tick enquanto o anterior ainda esta processando', async () => {
    let resolveFirstAttempt: (() => void) | undefined;
    const attemptPromise = new Promise<void>((resolve) => {
      resolveFirstAttempt = resolve;
    });

    const getPendingItems = jest.fn().mockResolvedValue([
      {
        itemId: 'item_1',
        jobId: 'job_1',
        collectionCaseId: 'case_1',
        createdByUserId: 'usr_1',
      },
    ]);
    const repository = createRepository({ getPendingItems });
    const collectionCasesService = {
      attemptWhatsAppContact: jest.fn().mockImplementation(async () => {
        await attemptPromise;
        return { outcome: 'sent', result: { attemptId: 'att_1' } };
      }),
    } as unknown as CollectionCasesService;

    const worker = new WhatsappBulkContactWorkerService(
      repository,
      collectionCasesService,
    );

    const firstTick = worker.tick();
    await worker.tick(); // deve ser ignorado, pois o primeiro ainda roda

    expect(getPendingItems).toHaveBeenCalledTimes(1);

    resolveFirstAttempt!();
    await firstTick;
  });
});
