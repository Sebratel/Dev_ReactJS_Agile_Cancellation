export type AuditLogActorResponse = {
  id: string;
  name: string;
  email: string;
};

export type AuditLogListItemResponse = {
  id: string;
  actor: AuditLogActorResponse | null;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};
