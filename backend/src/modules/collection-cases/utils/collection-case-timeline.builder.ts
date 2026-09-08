import type {
  CollectionCaseTimelineEvent,
  CollectionCaseTimelineEventType,
  CollectionCaseTimelineResponse,
} from '@/modules/collection-cases/dto/collection-case-timeline.response';

const ATTEMPT_CHANNEL_LABELS: Record<string, string> = {
  PHONE: 'Telefone',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  SMS: 'SMS',
  IN_PERSON: 'Presencial',
  OTHER: 'Outro',
};

const ATTEMPT_RESULT_LABELS: Record<string, string> = {
  NO_ANSWER: 'Sem resposta',
  CONTACTED: 'Contato realizado',
  PROMISE_MADE: 'Promessa registrada',
  REFUSED: 'Recusa',
  WRONG_NUMBER: 'Numero incorreto',
  CALLBACK_REQUESTED: 'Retorno solicitado',
  OTHER: 'Outro',
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Registro criado',
  UPDATE: 'Registro atualizado',
  DELETE: 'Registro removido',
  STATUS_CHANGE: 'Status alterado',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  EXPORT: 'Exportacao',
  IMPORT: 'Importacao',
  INTEGRATION: 'Integracao',
};

export type TimelineAttemptSource = {
  id: string;
  channel: string;
  result: string;
  attemptedAt: Date | string;
  notes?: string | null;
  actorName?: string | null;
  isAutomatic?: boolean;
};

export type TimelinePromiseSource = {
  id: string;
  promisedAmount: string | number | { toString(): string };
  promisedDate: Date | string;
  notes?: string | null;
  createdAt: Date | string;
  fulfilledAt?: Date | string | null;
  brokenAt?: Date | string | null;
  cancelledAt?: Date | string | null;
  createdActorName?: string | null;
  fulfilledActorName?: string | null;
  brokenActorName?: string | null;
  cancelledActorName?: string | null;
};

export type TimelineAuditSource = {
  id: string;
  action: string;
  createdAt: Date | string;
  actorName?: string | null;
  metadata?: Record<string, unknown> | null;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
};

export type TimelineCancellationSentSource = {
  id: string;
  reason: string;
  notes?: string | null;
  occurredAt: Date | string;
  actorName?: string | null;
};

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

export type BuildCollectionCaseTimelineInput = {
  caseId: string;
  caseCreatedAt: Date | string;
  customerName?: string | null;
  attempts: TimelineAttemptSource[];
  promises: TimelinePromiseSource[];
  cancellationSentEvents: TimelineCancellationSentSource[];
  cancellationStepCompletedEvents: TimelineCancellationStepCompletedSource[];
  cancellationProcessCompletedEvents: TimelineCancellationProcessCompletedSource[];
  auditLogs: TimelineAuditSource[];
};

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function formatAmount(value: string | number | { toString(): string }) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  return value.toString();
}

function buildAttemptDescription(attempt: TimelineAttemptSource) {
  const channel = ATTEMPT_CHANNEL_LABELS[attempt.channel] ?? attempt.channel;
  const result = ATTEMPT_RESULT_LABELS[attempt.result] ?? attempt.result;
  const notes = attempt.notes?.trim();

  if (notes) {
    return `${channel} · ${result}. ${notes}`;
  }

  return `${channel} · ${result}.`;
}

function buildPromiseDescription(
  promisedAmount: string,
  promisedDate: Date | string,
  notes?: string | null,
) {
  const dateLabel = toIso(promisedDate).slice(0, 10);
  const base = `Valor prometido: R$ ${promisedAmount.replace('.', ',')} · vencimento ${dateLabel}.`;
  const trimmedNotes = notes?.trim();

  if (trimmedNotes) {
    return `${base} ${trimmedNotes}`;
  }

  return base;
}

function buildAuditDescription(audit: TimelineAuditSource) {
  const actionLabel = AUDIT_ACTION_LABELS[audit.action] ?? audit.action;
  const resourceType =
    typeof audit.metadata?.resourceType === 'string'
      ? audit.metadata.resourceType
      : null;

  if (resourceType) {
    return `${actionLabel} (${resourceType}).`;
  }

  return `${actionLabel}.`;
}

function isAuditCoveredByEntityEvent(audit: TimelineAuditSource) {
  const metadata = audit.metadata ?? {};
  const resourceType = metadata.resourceType;
  const promiseAction = metadata.action;

  if (audit.action === 'CREATE' && typeof metadata.attemptId === 'string') {
    return true;
  }

  if (
    audit.action === 'CREATE' &&
    resourceType === 'PAYMENT_PROMISE' &&
    typeof metadata.promiseId === 'string'
  ) {
    return true;
  }

  if (
    audit.action === 'STATUS_CHANGE' &&
    resourceType === 'PAYMENT_PROMISE' &&
    (promiseAction === 'FULFILLED' ||
      promiseAction === 'BROKEN' ||
      promiseAction === 'CANCELLED')
  ) {
    return true;
  }

  if (
    (audit.action === 'STATUS_CHANGE' || audit.action === 'CREATE') &&
    resourceType === 'CANCELLATION_PROCESS' &&
    typeof metadata.cancellationProcessId === 'string'
  ) {
    return true;
  }

  if (
    audit.action === 'STATUS_CHANGE' &&
    resourceType === 'CANCELLATION_STEP' &&
    metadata.action === 'COMPLETED'
  ) {
    return true;
  }

  return false;
}

function sortEventsDesc(events: CollectionCaseTimelineEvent[]) {
  return [...events].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() -
      new Date(left.occurredAt).getTime(),
  );
}

function pushEvent(
  events: CollectionCaseTimelineEvent[],
  event: CollectionCaseTimelineEvent,
) {
  events.push(event);
}

export function buildCollectionCaseTimeline(
  input: BuildCollectionCaseTimelineInput,
): CollectionCaseTimelineResponse {
  const events: CollectionCaseTimelineEvent[] = [];

  pushEvent(events, {
    id: `case-${input.caseId}-created`,
    type: 'CASE_CREATED',
    title: 'Caso de cobranca criado',
    description: input.customerName
      ? `Caso aberto para ${input.customerName}.`
      : 'Caso de cobranca registrado na plataforma.',
    occurredAt: toIso(input.caseCreatedAt),
    actorName: null,
    metadata: { caseId: input.caseId },
  });

  for (const attempt of input.attempts) {
    pushEvent(events, {
      id: `attempt-${attempt.id}-created`,
      type: 'ATTEMPT_CREATED',
      title: 'Tentativa de cobranca registrada',
      description: buildAttemptDescription(attempt),
      occurredAt: toIso(attempt.attemptedAt),
      actorName: attempt.actorName ?? null,
      metadata: {
        attemptId: attempt.id,
        channel: attempt.channel,
        result: attempt.result,
        isAutomatic: attempt.isAutomatic ?? false,
      },
    });
  }

  for (const promise of input.promises) {
    const promisedAmount = formatAmount(promise.promisedAmount);

    pushEvent(events, {
      id: `promise-${promise.id}-created`,
      type: 'PAYMENT_PROMISE_CREATED',
      title: 'Promessa de pagamento registrada',
      description: buildPromiseDescription(
        promisedAmount,
        promise.promisedDate,
        promise.notes,
      ),
      occurredAt: toIso(promise.createdAt),
      actorName: promise.createdActorName ?? null,
      metadata: {
        promiseId: promise.id,
        promisedAmount,
      },
    });

    if (promise.fulfilledAt) {
      pushEvent(events, {
        id: `promise-${promise.id}-fulfilled`,
        type: 'PAYMENT_PROMISE_FULFILLED',
        title: 'Promessa de pagamento cumprida',
        description: `Pagamento confirmado para promessa de R$ ${promisedAmount.replace('.', ',')}.`,
        occurredAt: toIso(promise.fulfilledAt),
        actorName: promise.fulfilledActorName ?? null,
        metadata: { promiseId: promise.id },
      });
    }

    if (promise.brokenAt) {
      pushEvent(events, {
        id: `promise-${promise.id}-broken`,
        type: 'PAYMENT_PROMISE_BROKEN',
        title: 'Promessa de pagamento descumprida',
        description: `Promessa de R$ ${promisedAmount.replace('.', ',')} nao foi cumprida.`,
        occurredAt: toIso(promise.brokenAt),
        actorName: promise.brokenActorName ?? null,
        metadata: { promiseId: promise.id },
      });
    }

    if (promise.cancelledAt) {
      pushEvent(events, {
        id: `promise-${promise.id}-cancelled`,
        type: 'PAYMENT_PROMISE_CANCELLED',
        title: 'Promessa de pagamento cancelada',
        description: `Promessa de R$ ${promisedAmount.replace('.', ',')} foi cancelada.`,
        occurredAt: toIso(promise.cancelledAt),
        actorName: promise.cancelledActorName ?? null,
        metadata: { promiseId: promise.id },
      });
    }
  }

  for (const cancellation of input.cancellationSentEvents) {
    const description = cancellation.notes?.trim()
      ? `Motivo: ${cancellation.reason}. ${cancellation.notes.trim()}`
      : `Motivo: ${cancellation.reason}.`;

    pushEvent(events, {
      id: `cancellation-${cancellation.id}-sent`,
      type: 'CASE_SENT_TO_CANCELLATION',
      title: 'Caso encaminhado para cancelamento',
      description,
      occurredAt: toIso(cancellation.occurredAt),
      actorName: cancellation.actorName ?? null,
      metadata: {
        cancellationProcessId: cancellation.id,
        reason: cancellation.reason,
      },
    });
  }

  for (const step of input.cancellationStepCompletedEvents) {
    const protocolSuffix = step.externalProtocol?.trim()
      ? ` Protocolo: ${step.externalProtocol.trim()}.`
      : '';
    const notesSuffix = step.notes?.trim() ? ` ${step.notes.trim()}` : '';

    pushEvent(events, {
      id: `cancellation-step-${step.id}-completed`,
      type: 'CANCELLATION_STEP_COMPLETED',
      title: 'Etapa de cancelamento concluida',
      description: `Etapa ${step.stepName} concluida.${protocolSuffix}${notesSuffix}`,
      occurredAt: toIso(step.occurredAt),
      actorName: step.actorName ?? null,
      metadata: {
        cancellationProcessId: step.cancellationProcessId,
        stepId: step.id,
        stepCode: step.stepCode,
      },
    });
  }

  for (const process of input.cancellationProcessCompletedEvents) {
    pushEvent(events, {
      id: `cancellation-${process.id}-completed`,
      type: 'CANCELLATION_PROCESS_COMPLETED',
      title: 'Processo de cancelamento concluido',
      description: 'Todas as etapas do cancelamento foram concluidas.',
      occurredAt: toIso(process.occurredAt),
      actorName: process.actorName ?? null,
      metadata: {
        cancellationProcessId: process.id,
      },
    });
  }

  for (const audit of input.auditLogs) {
    if (isAuditCoveredByEntityEvent(audit)) {
      continue;
    }

    pushEvent(events, {
      id: `audit-${audit.id}`,
      type: 'AUDIT_EVENT',
      title: AUDIT_ACTION_LABELS[audit.action] ?? 'Evento de auditoria',
      description: buildAuditDescription(audit),
      occurredAt: toIso(audit.createdAt),
      actorName: audit.actorName ?? null,
      metadata: {
        auditLogId: audit.id,
        action: audit.action,
        ...(audit.metadata ?? {}),
      },
    });
  }

  return {
    caseId: input.caseId,
    events: sortEventsDesc(events),
  };
}

export function getTimelineEventTypeLabel(
  type: CollectionCaseTimelineEventType,
) {
  const labels: Record<CollectionCaseTimelineEventType, string> = {
    CASE_CREATED: 'Caso criado',
    ATTEMPT_CREATED: 'Tentativa',
    PAYMENT_PROMISE_CREATED: 'Promessa registrada',
    PAYMENT_PROMISE_FULFILLED: 'Promessa cumprida',
    PAYMENT_PROMISE_BROKEN: 'Promessa descumprida',
    PAYMENT_PROMISE_CANCELLED: 'Promessa cancelada',
    CASE_SENT_TO_CANCELLATION: 'Encaminhado para cancelamento',
    CANCELLATION_STEP_COMPLETED: 'Etapa concluida',
    CANCELLATION_PROCESS_COMPLETED: 'Cancelamento concluido',
    AUDIT_EVENT: 'Auditoria',
  };

  return labels[type];
}
