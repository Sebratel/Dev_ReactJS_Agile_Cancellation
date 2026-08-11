export type IntegrationEventStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'DISCARDED';

export type IntegrationEventListItemResponse = {
  id: string;
  source: string;
  eventType: string;
  externalId: string | null;
  status: IntegrationEventStatus;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  payloadSize: number;
};

export type IntegrationEventsSummaryResponse = {
  pending: number;
  processing: number;
  failed: number;
  completedToday: number;
};

export type IntegrationEventsListParams = {
  status?: IntegrationEventStatus | '';
  source?: string;
  eventType?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};
