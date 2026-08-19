import { Injectable } from '@nestjs/common';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import { PrismaService } from '@/database/prisma/prisma.service';
import type { BulkContactJobResponse } from '@/modules/whatsapp-bulk-contact/dto/bulk-contact-job.response';
import type {
  BulkContactJobRepository,
  BulkContactPendingItem,
} from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job.repository';

function mapJob(job: {
  id: string;
  status: string;
  totalCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}): BulkContactJobResponse {
  return {
    id: job.id,
    status: job.status as BulkContactJobResponse['status'],
    totalCount: job.totalCount,
    sentCount: job.sentCount,
    skippedCount: job.skippedCount,
    failedCount: job.failedCount,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class BulkContactJobPrismaRepository implements BulkContactJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(
    caseIds: string[],
    createdByUserId: string | null,
  ): Promise<BulkContactJobResponse> {
    // Dedup — o supervisor pode ter clicado com casos repetidos na selecao.
    const uniqueCaseIds = Array.from(new Set(caseIds));

    const job = await this.prisma.bulkContactJob.create({
      data: {
        totalCount: uniqueCaseIds.length,
        createdByUserId,
        items: {
          createMany: {
            data: uniqueCaseIds.map((collectionCaseId) => ({
              collectionCaseId,
            })),
          },
        },
      },
    });

    return mapJob(job);
  }

  async getJob(jobId: string): Promise<BulkContactJobResponse | null> {
    const job = await this.prisma.bulkContactJob.findUnique({
      where: { id: jobId },
    });

    return job ? mapJob(job) : null;
  }

  async listJobs({ page, limit }: { page: number; limit: number }) {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.bulkContactJob.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bulkContactJob.count(),
    ]);

    return createPaginatedResponse(jobs.map(mapJob), page, limit, total);
  }

  async getPendingItems(limit: number): Promise<BulkContactPendingItem[]> {
    const items = await this.prisma.bulkContactJobItem.findMany({
      where: { status: 'PENDING', job: { status: { not: 'COMPLETED' } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        jobId: true,
        collectionCaseId: true,
        job: { select: { createdByUserId: true } },
      },
    });

    return items.map((item) => ({
      itemId: item.id,
      jobId: item.jobId,
      collectionCaseId: item.collectionCaseId,
      createdByUserId: item.job.createdByUserId,
    }));
  }

  async recordItemResult({
    itemId,
    jobId,
    status,
    errorMessage,
  }: {
    itemId: string;
    jobId: string;
    status: 'SENT' | 'SKIPPED_STATUS' | 'SKIPPED_PHONE' | 'FAILED';
    errorMessage?: string | null;
  }): Promise<void> {
    const now = new Date();
    const counterField =
      status === 'SENT'
        ? 'sentCount'
        : status === 'FAILED'
          ? 'failedCount'
          : 'skippedCount';

    await this.prisma.$transaction(async (tx) => {
      await tx.bulkContactJobItem.update({
        where: { id: itemId },
        data: { status, errorMessage: errorMessage ?? null, processedAt: now },
      });

      const currentJob = await tx.bulkContactJob.findUniqueOrThrow({
        where: { id: jobId },
        select: { startedAt: true },
      });

      const remainingCount = await tx.bulkContactJobItem.count({
        where: { jobId, status: 'PENDING' },
      });

      await tx.bulkContactJob.update({
        where: { id: jobId },
        data: {
          [counterField]: { increment: 1 },
          startedAt: currentJob.startedAt ?? now,
          status: remainingCount === 0 ? 'COMPLETED' : 'PROCESSING',
          finishedAt: remainingCount === 0 ? now : undefined,
        },
      });
    });
  }
}
