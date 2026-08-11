import type { IngestCollectionEventDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';

export type IngestionSummary = {
  received: number;
  customersUpserted: number;
  contractsUpserted: number;
  invoicesUpserted: number;
  casesUpserted: number;
  skipped: number;
};

export interface WebhooksRepository {
  ingestCollectionBatch(
    source: string,
    events: IngestCollectionEventDto[],
  ): Promise<IngestionSummary>;
}
