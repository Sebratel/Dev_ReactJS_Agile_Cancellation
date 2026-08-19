export type BulkContactJobStatusValue = 'PENDING' | 'PROCESSING' | 'COMPLETED';

export type BulkContactJobResponse = {
  id: string;
  status: BulkContactJobStatusValue;
  totalCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};
