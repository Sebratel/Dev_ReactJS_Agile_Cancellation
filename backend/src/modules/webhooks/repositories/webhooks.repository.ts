import type { IngestCollectionEventDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';
import type { MatrixReplyDto } from '@/modules/webhooks/dto/matrix-reply.dto';

export type IngestionSummary = {
  received: number;
  customersUpserted: number;
  contractsUpserted: number;
  invoicesUpserted: number;
  casesUpserted: number;
  skipped: number;
};

export type MatrixReplyResult =
  | {
      outcome: 'success';
      caseId: string;
      assignedUserId: string | null;
      customerName: string;
      attemptId: string;
    }
  | {
      outcome: 'already_processed';
      caseId: string;
      assignedUserId: string | null;
      customerName: string;
    }
  | {
      outcome: 'case_not_found';
    };

export interface WebhooksRepository {
  ingestCollectionBatch(
    source: string,
    events: IngestCollectionEventDto[],
  ): Promise<IngestionSummary>;

  recordMatrixReply(input: MatrixReplyDto): Promise<MatrixReplyResult>;
}
