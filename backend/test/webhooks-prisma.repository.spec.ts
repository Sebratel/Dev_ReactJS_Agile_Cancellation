/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- matchers do jest (expect.*) e mocks tipados como any */
import { WebhooksPrismaRepository } from '@/modules/webhooks/repositories/webhooks-prisma.repository';
import type { PrismaService } from '@/database/prisma/prisma.service';
import type { IngestCollectionEventDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';

type AttemptCreateMock = jest.Mock;

function buildEvent(
  overrides?: Partial<IngestCollectionEventDto>,
): IngestCollectionEventDto {
  return {
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
    ...overrides,
  };
}

/**
 * Monta um PrismaService mockado cujo $transaction executa o callback com um
 * `tx` controlado. `existingCaseId` simula um caso ja existente (findUnique
 * retorna { id }) ou um caso novo (null).
 */
function createPrismaMock(existingCaseId: string | null) {
  const collectionAttemptCreate: AttemptCreateMock = jest
    .fn()
    .mockResolvedValue({ id: 'att-new' });

  const tx = {
    customer: { upsert: jest.fn().mockResolvedValue({ id: 'cus-1' }) },
    contract: { upsert: jest.fn().mockResolvedValue({ id: 'ctr-1' }) },
    invoice: {
      upsert: jest.fn().mockResolvedValue({ id: 'inv-1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    collectionCase: {
      findUnique: jest
        .fn()
        .mockResolvedValue(existingCaseId ? { id: existingCaseId } : null),
      upsert: jest.fn().mockResolvedValue({ id: existingCaseId ?? 'case-new' }),
    },
    collectionAttempt: { create: collectionAttemptCreate },
  };

  const transaction = jest.fn(
    async (cb: (txArg: typeof tx) => Promise<unknown>) => cb(tx),
  );
  const prisma = {
    $transaction: transaction,
    integrationEvent: { create: jest.fn().mockResolvedValue({ id: 'evt-1' }) },
  } as unknown as PrismaService;

  return { prisma, tx, collectionAttemptCreate, transaction };
}

describe('WebhooksPrismaRepository.ingestCollectionBatch', () => {
  it('cria tentativa automatica inicial quando o caso e novo', async () => {
    const { prisma, tx, collectionAttemptCreate } = createPrismaMock(null);
    const repository = new WebhooksPrismaRepository(prisma);

    await repository.ingestCollectionBatch('n8n', [buildEvent()]);

    // O check de existencia acontece antes do upsert.
    expect(tx.collectionCase.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { externalId: 'case-ext-1' } }),
    );

    expect(collectionAttemptCreate).toHaveBeenCalledTimes(1);
    expect(collectionAttemptCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        collectionCaseId: 'case-new',
        isAutomatic: true,
        channel: 'WHATSAPP',
        result: 'NO_ANSWER',
        performedByUserId: null,
      }),
    });
  });

  it('NAO cria tentativa quando o caso ja existe (evita duplicar em re-ingestao)', async () => {
    const { prisma, collectionAttemptCreate } =
      createPrismaMock('case-existing');
    const repository = new WebhooksPrismaRepository(prisma);

    await repository.ingestCollectionBatch('n8n', [buildEvent()]);

    expect(collectionAttemptCreate).not.toHaveBeenCalled();
  });

  it('cria exatamente 1 tentativa automatica por caso novo em lote', async () => {
    const { prisma, collectionAttemptCreate } = createPrismaMock(null);
    const repository = new WebhooksPrismaRepository(prisma);

    await repository.ingestCollectionBatch('n8n', [
      buildEvent({ externalId: 'case-a' }),
      buildEvent({ externalId: 'case-b' }),
    ]);

    expect(collectionAttemptCreate).toHaveBeenCalledTimes(2);
    for (const call of collectionAttemptCreate.mock.calls) {
      expect(call[0].data.isAutomatic).toBe(true);
    }
  });

  describe('conflito de escrita (P2034) — causa do loop de restart da API', () => {
    const p2034 = () =>
      Object.assign(
        new Error(
          'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
        ),
        { code: 'P2034', meta: { modelName: 'Invoice' } },
      );

    it('refaz a transacao inteira e conclui o lote quando o P2034 e transitorio', async () => {
      const { prisma, tx, transaction } = createPrismaMock(null);
      tx.invoice.upsert
        .mockRejectedValueOnce(p2034())
        .mockRejectedValueOnce(p2034())
        .mockResolvedValue({ id: 'inv-1' });
      const repository = new WebhooksPrismaRepository(prisma);

      const summary = await repository.ingestCollectionBatch('n8n', [
        buildEvent(),
      ]);

      expect(transaction).toHaveBeenCalledTimes(3);
      expect(summary.casesUpserted).toBe(1);
    });

    it('rejeita (sem derrubar o processo) quando o conflito persiste, apos 4 tentativas', async () => {
      const { prisma, tx, transaction } = createPrismaMock(null);
      tx.invoice.upsert.mockRejectedValue(p2034());
      const repository = new WebhooksPrismaRepository(prisma);

      await expect(
        repository.ingestCollectionBatch('n8n', [buildEvent()]),
      ).rejects.toMatchObject({ code: 'P2034' });
      expect(transaction).toHaveBeenCalledTimes(4);
    });

    it('nao repete erros que nao sao conflito de escrita', async () => {
      const { prisma, tx, transaction } = createPrismaMock(null);
      tx.invoice.upsert.mockRejectedValue(new Error('outro erro'));
      const repository = new WebhooksPrismaRepository(prisma);

      await expect(
        repository.ingestCollectionBatch('n8n', [buildEvent()]),
      ).rejects.toThrow('outro erro');
      expect(transaction).toHaveBeenCalledTimes(1);
    });
  });
});
