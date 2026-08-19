import type { PaginatedResponse } from '@/common/pagination/paginated-response';
import type { BulkContactJobResponse } from '@/modules/whatsapp-bulk-contact/dto/bulk-contact-job.response';

export type BulkContactItemStatus =
  | 'PENDING'
  | 'SENT'
  | 'SKIPPED_STATUS'
  | 'SKIPPED_PHONE'
  | 'FAILED';

export type BulkContactPendingItem = {
  itemId: string;
  jobId: string;
  collectionCaseId: string;
  createdByUserId: string | null;
};

export interface BulkContactJobRepository {
  createJob(
    caseIds: string[],
    createdByUserId: string | null,
  ): Promise<BulkContactJobResponse>;

  getJob(jobId: string): Promise<BulkContactJobResponse | null>;

  // Historico de envios em lote (mais recentes primeiro), para a tela de
  // acompanhamento.
  listJobs(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedResponse<BulkContactJobResponse>>;

  // Itens ainda nao processados, de qualquer job nao finalizado — o worker
  // roda em ordem de chegada, sem prioridade entre jobs.
  getPendingItems(limit: number): Promise<BulkContactPendingItem[]>;

  // Registra o resultado de UM item e atualiza os contadores/status do job
  // pai. Quando nao sobrar nenhum item PENDING do job, marca o job como
  // COMPLETED.
  recordItemResult(params: {
    itemId: string;
    jobId: string;
    status: Exclude<BulkContactItemStatus, 'PENDING'>;
    errorMessage?: string | null;
  }): Promise<void>;
}
