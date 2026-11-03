import type { PaginatedResponse } from '@/common/pagination/paginated-response';
import type {
  IntegrationEventListItemResponse,
  IntegrationEventsSummaryResponse,
  SyncHealthResponse,
} from '@/modules/integration-events/dto/integration-event-list-item.response';

export type ListIntegrationEventsParams = {
  status?: string;
  source?: string;
  eventType?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export interface IntegrationEventsRepository {
  list(
    params: ListIntegrationEventsParams,
  ): Promise<PaginatedResponse<IntegrationEventListItemResponse>>;
  getSummary(): Promise<IntegrationEventsSummaryResponse>;
  getSyncHealth(): Promise<SyncHealthResponse>;
}

export const INTEGRATION_EVENTS_REPOSITORY = 'INTEGRATION_EVENTS_REPOSITORY';
