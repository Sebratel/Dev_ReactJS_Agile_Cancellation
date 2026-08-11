import type {
  TimelineAuditSource,
  TimelineCancellationSentSource,
} from '@/modules/collection-cases/utils/collection-case-timeline.builder';
import { getCancellationStepLabel } from '@/modules/cancellations/constants/default-cancellation-steps.constants';

type AuditLogLike = {
  id: string;
  action: string;
  createdAt: Date | string;
  performedByUserId?: string | null;
  performedBy?: { name: string } | null;
  metadata?: unknown;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function mapAuditLogToTimelineSource(
  audit: AuditLogLike,
): TimelineAuditSource {
  return {
    id: audit.id,
    action: audit.action,
    createdAt: audit.createdAt,
    actorName: audit.performedBy?.name ?? null,
    metadata: asRecord(audit.metadata),
    beforeSnapshot: asRecord(audit.beforeSnapshot),
    afterSnapshot: asRecord(audit.afterSnapshot),
  };
}

export function resolvePromiseActorFromAuditLogs(
  auditLogs: TimelineAuditSource[],
  promiseId: string,
  action: 'CREATE' | 'FULFILLED' | 'BROKEN' | 'CANCELLED',
) {
  if (action === 'CREATE') {
    const match = auditLogs.find(
      (audit) =>
        audit.action === 'CREATE' &&
        audit.metadata?.resourceType === 'PAYMENT_PROMISE' &&
        audit.metadata?.promiseId === promiseId,
    );

    return match?.actorName ?? null;
  }

  const match = auditLogs.find(
    (audit) =>
      audit.action === 'STATUS_CHANGE' &&
      audit.metadata?.resourceType === 'PAYMENT_PROMISE' &&
      audit.metadata?.promiseId === promiseId &&
      audit.metadata?.action === action,
  );

  return match?.actorName ?? null;
}

export function resolveCancellationSentEventsFromAuditLogs(
  auditLogs: TimelineAuditSource[],
): TimelineCancellationSentSource[] {
  return auditLogs
    .filter(
      (audit) =>
        audit.metadata?.resourceType === 'CANCELLATION_PROCESS' &&
        typeof audit.metadata.cancellationProcessId === 'string' &&
        typeof audit.metadata.reason === 'string',
    )
    .map((audit) => ({
      id: String(audit.metadata?.cancellationProcessId),
      reason: String(audit.metadata?.reason),
      notes:
        typeof audit.metadata?.notes === 'string' ? audit.metadata.notes : null,
      occurredAt: audit.createdAt,
      actorName: audit.actorName ?? null,
    }));
}

export type TimelineCancellationStepCompletedSource = {
  id: string;
  cancellationProcessId: string;
  stepCode: string;
  stepName: string;
  notes?: string | null;
  externalProtocol?: string | null;
  occurredAt: Date | string;
  actorName?: string | null;
};

export type TimelineCancellationProcessCompletedSource = {
  id: string;
  occurredAt: Date | string;
  actorName?: string | null;
};

export function resolveCancellationStepCompletedEventsFromAuditLogs(
  auditLogs: TimelineAuditSource[],
): TimelineCancellationStepCompletedSource[] {
  return auditLogs
    .filter(
      (audit) =>
        audit.metadata?.resourceType === 'CANCELLATION_STEP' &&
        audit.metadata?.action === 'COMPLETED' &&
        typeof audit.metadata.cancellationProcessId === 'string' &&
        typeof audit.metadata.stepId === 'string' &&
        typeof audit.metadata.stepCode === 'string',
    )
    .map((audit) => ({
      id: String(audit.metadata?.stepId),
      cancellationProcessId: String(audit.metadata?.cancellationProcessId),
      stepCode: String(audit.metadata?.stepCode),
      stepName: getCancellationStepLabel(String(audit.metadata?.stepCode)),
      notes:
        typeof audit.metadata?.notes === 'string' ? audit.metadata.notes : null,
      externalProtocol:
        typeof audit.afterSnapshot?.externalProtocol === 'string'
          ? audit.afterSnapshot.externalProtocol
          : null,
      occurredAt: audit.createdAt,
      actorName: audit.actorName ?? null,
    }));
}

export function resolveCancellationProcessCompletedEventsFromAuditLogs(
  auditLogs: TimelineAuditSource[],
): TimelineCancellationProcessCompletedSource[] {
  return auditLogs
    .filter(
      (audit) =>
        audit.metadata?.resourceType === 'CANCELLATION_PROCESS' &&
        audit.metadata?.action === 'COMPLETED' &&
        typeof audit.metadata.cancellationProcessId === 'string',
    )
    .map((audit) => ({
      id: String(audit.metadata?.cancellationProcessId),
      occurredAt: audit.createdAt,
      actorName: audit.actorName ?? null,
    }));
}
