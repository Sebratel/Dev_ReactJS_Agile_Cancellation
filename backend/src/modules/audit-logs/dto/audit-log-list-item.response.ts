import type { AuditLogCategory } from '@/modules/audit-logs/utils/audit-log-presentation.util';

export type AuditLogActorResponse = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type AuditLogSubjectResponse = {
  customerName: string;
  contractCode: string | null;
};

export type AuditLogListItemResponse = {
  id: string;
  actor: AuditLogActorResponse | null;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  // Leitura para a gerência: tipo da ação, trecho de frase e complemento.
  category: AuditLogCategory;
  verb: string;
  detail: string | null;
  // Cliente/contrato afetado (quando a ação é sobre um caso de cobrança).
  subject: AuditLogSubjectResponse | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};
