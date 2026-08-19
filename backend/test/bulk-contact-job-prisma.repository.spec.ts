import { BulkContactJobPrismaRepository } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job-prisma.repository';
import type { PrismaService } from '@/database/prisma/prisma.service';

describe('BulkContactJobPrismaRepository', () => {
  it('cria job deduplicando ids e delegando createMany dos itens', async () => {
    const createdAt = new Date('2026-08-01T00:00:00.000Z');
    const create = jest.fn().mockResolvedValue({
      id: 'job_1',
      status: 'PENDING',
      totalCount: 2,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      createdAt,
      startedAt: null,
      finishedAt: null,
    });
    const prisma = {
      bulkContactJob: { create },
    } as unknown as PrismaService;

    const repository = new BulkContactJobPrismaRepository(prisma);
    const job = await repository.createJob(
      ['case_1', 'case_2', 'case_1'],
      'usr_supervisor',
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        totalCount: 2,
        createdByUserId: 'usr_supervisor',
        items: {
          createMany: {
            data: [
              { collectionCaseId: 'case_1' },
              { collectionCaseId: 'case_2' },
            ],
          },
        },
      },
    });
    expect(job).toEqual({
      id: 'job_1',
      status: 'PENDING',
      totalCount: 2,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      createdAt: createdAt.toISOString(),
      startedAt: null,
      finishedAt: null,
    });
  });

  it('getJob retorna null quando o job nao existe', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const prisma = {
      bulkContactJob: { findUnique },
    } as unknown as PrismaService;

    const repository = new BulkContactJobPrismaRepository(prisma);
    expect(await repository.getJob('job_x')).toBeNull();
  });

  it('recordItemResult marca o job como COMPLETED quando nao ha mais itens pendentes', async () => {
    const itemUpdate = jest.fn().mockResolvedValue(undefined);
    const jobFindUniqueOrThrow = jest
      .fn()
      .mockResolvedValue({ startedAt: new Date('2026-08-01T00:00:00.000Z') });
    const itemCount = jest.fn().mockResolvedValue(0);
    const jobUpdate = jest.fn().mockResolvedValue(undefined);

    const tx = {
      bulkContactJobItem: { update: itemUpdate, count: itemCount },
      bulkContactJob: {
        findUniqueOrThrow: jobFindUniqueOrThrow,
        update: jobUpdate,
      },
    };
    const transaction = jest.fn().mockImplementation((fn) => fn(tx));
    const prisma = {
      $transaction: transaction,
    } as unknown as PrismaService;

    const repository = new BulkContactJobPrismaRepository(prisma);
    await repository.recordItemResult({
      itemId: 'item_1',
      jobId: 'job_1',
      status: 'SENT',
    });

    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: expect.objectContaining({ status: 'SENT', errorMessage: null }),
    });
    expect(jobUpdate).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: expect.objectContaining({
        sentCount: { increment: 1 },
        status: 'COMPLETED',
        finishedAt: expect.any(Date),
      }),
    });
  });

  it('recordItemResult mantem o job PROCESSING quando ainda ha itens pendentes', async () => {
    const jobFindUniqueOrThrow = jest.fn().mockResolvedValue({ startedAt: null });
    const itemCount = jest.fn().mockResolvedValue(3);
    const jobUpdate = jest.fn().mockResolvedValue(undefined);

    const tx = {
      bulkContactJobItem: { update: jest.fn(), count: itemCount },
      bulkContactJob: {
        findUniqueOrThrow: jobFindUniqueOrThrow,
        update: jobUpdate,
      },
    };
    const transaction = jest.fn().mockImplementation((fn) => fn(tx));
    const prisma = { $transaction: transaction } as unknown as PrismaService;

    const repository = new BulkContactJobPrismaRepository(prisma);
    await repository.recordItemResult({
      itemId: 'item_1',
      jobId: 'job_1',
      status: 'FAILED',
      errorMessage: 'timeout',
    });

    expect(jobUpdate).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: expect.objectContaining({
        failedCount: { increment: 1 },
        status: 'PROCESSING',
        finishedAt: undefined,
      }),
    });
  });
});
