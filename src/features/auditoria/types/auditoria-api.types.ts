import { type PaginatedResponse } from '@/services/api/types/api-envelope';

export type AuditLogActor = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type AuditLogCategory =
  | 'CONTACT'
  | 'PROMISE'
  | 'CANCELLATION'
  | 'ASSIGNMENT'
  | 'STATUS'
  | 'ACCESS'
  | 'EXPORT'
  | 'OTHER';

export type AuditLogSubject = {
  customerName: string;
  contractCode: string | null;
};

export type AuditLogItem = {
  id: string;
  actor: AuditLogActor | null;
  // Sem usuário (ex.: tentativa de login de e-mail desconhecido): o e-mail usado.
  actorLabel?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  // Leitura para a gerência (sempre enviados pela API; opcionais para tolerar
  // versões antigas do backend durante um deploy).
  category?: AuditLogCategory;
  verb?: string;
  detail?: string | null;
  subject?: AuditLogSubject | null;
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
  category?: string;
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
