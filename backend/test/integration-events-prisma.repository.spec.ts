import { IntegrationEventsPrismaRepository } from '@/modules/integration-events/repositories/integration-events-prisma.repository';
import type { PrismaService } from '@/database/prisma/prisma.service';

describe('IntegrationEventsPrismaRepository.getSyncHealth', () => {
  it('resume o frescor: ultima sync, ultima ingestao, ultima entrada e contagens', async () => {
    const erpSyncDate = new Date('2026-09-08T20:00:00.000Z');
    const ingestDate = new Date('2026-09-07T02:30:00.000Z');
    const newCaseDate = new Date('2026-09-06T03:00:00.000Z');

    const findFirst = jest
      .fn()
      // lastErpSync (source erp-sync)
      .mockResolvedValueOnce({ createdAt: erpSyncDate })
      // lastIngest (collection_cases.ingest)
      .mockResolvedValueOnce({ createdAt: ingestDate });
    const caseFindFirst = jest
      .fn()
      .mockResolvedValueOnce({ createdAt: newCaseDate });
    const caseCount = jest
      .fn()
      .mockResolvedValueOnce(0) // 24h
      .mockResolvedValueOnce(104); // 7d

    const prisma = {
      integrationEvent: { findFirst },
      collectionCase: { findFirst: caseFindFirst, count: caseCount },
    } as unknown as PrismaService;

    const repository = new IntegrationEventsPrismaRepository(prisma);
    const result = await repository.getSyncHealth();

    expect(result).toEqual({
      lastErpSyncAt: erpSyncDate.toISOString(),
      lastIngestEventAt: ingestDate.toISOString(),
      lastNewCaseAt: newCaseDate.toISOString(),
      newCasesLast24h: 0,
      newCasesLast7d: 104,
    });

    // A busca de ultima sync filtra pela origem erp-sync.
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { source: 'erp-sync' } }),
    );
  });

  it('devolve null quando nao ha eventos nem casos', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const caseFindFirst = jest.fn().mockResolvedValue(null);
    const caseCount = jest.fn().mockResolvedValue(0);

    const prisma = {
      integrationEvent: { findFirst },
      collectionCase: { findFirst: caseFindFirst, count: caseCount },
    } as unknown as PrismaService;

    const repository = new IntegrationEventsPrismaRepository(prisma);
    const result = await repository.getSyncHealth();

    expect(result).toEqual({
      lastErpSyncAt: null,
      lastIngestEventAt: null,
      lastNewCaseAt: null,
      newCasesLast24h: 0,
      newCasesLast7d: 0,
    });
  });
});
