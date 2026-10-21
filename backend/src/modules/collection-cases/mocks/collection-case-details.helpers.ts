import type { CollectionCaseAttemptSummary } from '@/modules/collection-cases/dto/collection-case-details.response';
import type { CollectionCasePromiseSummary } from '@/modules/collection-cases/dto/collection-case-details.response';

export function buildMockDetailExtensions(
  outstandingAmount: string,
  recentAttempts: CollectionCaseAttemptSummary[],
  activePromise: CollectionCasePromiseSummary | null,
) {
  return {
    totalOutstanding: outstandingAmount,
    attempts: recentAttempts,
    promises: activePromise ? [activePromise] : [],
    invoices: [],
    cancellationProcess: null,
    origin: null,
  };
}
