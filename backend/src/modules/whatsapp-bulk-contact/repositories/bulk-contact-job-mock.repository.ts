import { Injectable } from '@nestjs/common';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import type { BulkContactJobResponse } from '@/modules/whatsapp-bulk-contact/dto/bulk-contact-job.response';
import type {
  BulkContactItemStatus,
  BulkContactJobRepository,
  BulkContactPendingItem,
} from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job.repository';

type MockJob = BulkContactJobResponse & {
  createdByUserId: string | null;
};

type MockItem = {
  id: string;
  jobId: string;
  collectionCaseId: string;
  status: BulkContactItemStatus;
  errorMessage: string | null;
};

// Estado em memoria, mesmo padrao dos demais mocks do app (nao sobrevive a
// reinicio do processo — suficiente para dev local sem banco/testes).
const jobs = new Map<string, MockJob>();
const items = new Map<string, MockItem>();
let sequence = 0;

function nextId(prefix: string) {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

export function resetMockBulkContactJobs() {
  jobs.clear();
  items.clear();
  sequence = 0;
}

@Injectable()
export class BulkContactJobMockRepository implements BulkContactJobRepository {
  createJob(
    caseIds: string[],
    createdByUserId: string | null,
  ): Promise<BulkContactJobResponse> {
    const uniqueCaseIds = Array.from(new Set(caseIds));
    const jobId = nextId('bulk_contact_job');
    const now = new Date().toISOString();

    const job: MockJob = {
      id: jobId,
      status: 'PENDING',
      totalCount: uniqueCaseIds.length,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
      createdByUserId,
    };
    jobs.set(jobId, job);

    for (const collectionCaseId of uniqueCaseIds) {
      const itemId = nextId('bulk_contact_item');
      items.set(itemId, {
        id: itemId,
        jobId,
        collectionCaseId,
        status: 'PENDING',
        errorMessage: null,
      });
    }

    return Promise.resolve(job);
  }

  getJob(jobId: string): Promise<BulkContactJobResponse | null> {
    return Promise.resolve(jobs.get(jobId) ?? null);
  }

  listJobs({ page, limit }: { page: number; limit: number }) {
    const sorted = Array.from(jobs.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    const startIndex = (page - 1) * limit;
    const items = sorted.slice(startIndex, startIndex + limit);

    return Promise.resolve(
      createPaginatedResponse(items, page, limit, sorted.length),
    );
  }

  getPendingItems(limit: number): Promise<BulkContactPendingItem[]> {
    const pending: BulkContactPendingItem[] = [];

    for (const item of items.values()) {
      if (pending.length >= limit) break;

      if (item.status !== 'PENDING') continue;

      const job = jobs.get(item.jobId);
      if (!job || job.status === 'COMPLETED') continue;

      pending.push({
        itemId: item.id,
        jobId: item.jobId,
        collectionCaseId: item.collectionCaseId,
        createdByUserId: job.createdByUserId,
      });
    }

    return Promise.resolve(pending);
  }

  recordItemResult({
    itemId,
    jobId,
    status,
    errorMessage,
  }: {
    itemId: string;
    jobId: string;
    status: Exclude<BulkContactItemStatus, 'PENDING'>;
    errorMessage?: string | null;
  }): Promise<void> {
    const item = items.get(itemId);
    const job = jobs.get(jobId);
    if (!item || !job) return Promise.resolve();

    item.status = status;
    item.errorMessage = errorMessage ?? null;

    if (status === 'SENT') job.sentCount += 1;
    else if (status === 'FAILED') job.failedCount += 1;
    else job.skippedCount += 1;

    const now = new Date().toISOString();
    if (!job.startedAt) job.startedAt = now;

    const stillPending = Array.from(items.values()).some(
      (candidate) =>
        candidate.jobId === jobId && candidate.status === 'PENDING',
    );

    job.status = stillPending ? 'PROCESSING' : 'COMPLETED';
    if (!stillPending) job.finishedAt = now;

    return Promise.resolve();
  }
}
