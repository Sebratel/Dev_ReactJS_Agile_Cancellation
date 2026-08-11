import { type PaginatedResponse } from '@/services/api/types/api-envelope';

export type AuditLogActor = {
  id: string;
  name: string;
  email: string;
};

export type AuditLogItem = {
  id: string;
  actor: AuditLogActor | null;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type AuditLogsListParams = {
  page?: number;
  limit?: number;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

export type AuditLogsPageResponse = PaginatedResponse<AuditLogItem>;

export const AUDIT_LOG_ACTION_OPTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATUS_CHANGE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'IMPORT',
  'INTEGRATION',
] as const;

export const AUDIT_LOG_ENTITY_TYPE_OPTIONS = ['COLLECTION_CASE'] as const;

export const AUDIT_LOGS_DEFAULT_LIMIT = 20;
