export type IntegrationEventListItemResponse = {
  id: string;
  source: string;
  eventType: string;
  externalId: string | null;
  status: string;
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
