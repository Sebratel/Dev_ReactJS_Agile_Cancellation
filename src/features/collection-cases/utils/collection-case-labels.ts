import { type StatusVariant } from '@/types/ui';

const STATUS_LABELS: Record<string, string> = {
  WAITING_TRIAGE: 'Aguardando triagem',
  IN_COLLECTION: 'Em cobrança',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  NO_RESPONSE: 'Sem resposta',
  ELIGIBLE_FOR_CANCELLATION: 'Elegível para cancelamento',
  CANCELLATION_IN_PROGRESS: 'Cancelamento em andamento',
  CLOSED: 'Encerrado',
  RECOVERED: 'Retido',
  PAYMENT_MADE: 'Pagamento realizado',
  RENEGOTIATED: 'Renegociado',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const DANGER_STATUSES = new Set(['NO_RESPONSE', 'ELIGIBLE_FOR_CANCELLATION']);

const SUCCESS_STATUSES = new Set(['RECOVERED', 'PAYMENT_MADE']);

// Renegociado não é pagamento (o cliente ainda deve) — sinaliza como atenção,
// não como sucesso.
const WARNING_STATUSES = new Set(['RENEGOTIATED']);

export function getCollectionStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function getPriorityLabel(priority: string) {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function getCollectionStatusVariant(status: string): StatusVariant {
  if (SUCCESS_STATUSES.has(status)) {
    return 'success';
  }

  if (WARNING_STATUSES.has(status)) {
    return 'warning';
  }

  if (DANGER_STATUSES.has(status)) {
    return 'danger';
  }

  return 'neutral';
}

export function getPriorityVariant(priority: string): StatusVariant {
  if (priority === 'CRITICAL') {
    return 'danger';
  }

  if (priority === 'HIGH') {
    return 'warning';
  }

  return 'neutral';
}

export function getSlaPresentation(slaDueAt: string | null): {
  label: string;
  variant: StatusVariant;
} {
  if (!slaDueAt) {
    return { label: 'Sem SLA', variant: 'neutral' };
  }

  const dueDate = new Date(slaDueAt);

  if (Number.isNaN(dueDate.getTime())) {
    return { label: 'SLA indisponível', variant: 'neutral' };
  }

  if (dueDate.getTime() < Date.now()) {
    return { label: 'SLA vencido', variant: 'danger' };
  }

  const now = new Date();
  const isDueToday =
    dueDate.getFullYear() === now.getFullYear() &&
    dueDate.getMonth() === now.getMonth() &&
    dueDate.getDate() === now.getDate();

  if (isDueToday) {
    return { label: 'SLA vence hoje', variant: 'warning' };
  }

  return { label: 'Dentro do SLA', variant: 'neutral' };
}

export function getAlertVariant(key: string): StatusVariant {
  if (
    key === 'overduePromises' ||
    key === 'slaBreached' ||
    key === 'noContactAttempt' ||
    key === 'inactiveAgents'
  ) {
    return 'danger';
  }

  if (key === 'promisesDueToday') {
    return 'warning';
  }

  return 'neutral';
}

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
  PROMISE_MADE: 'Promessa de pagamento',
  PROMISE_CREATED: 'Promessa de pagamento',
  REFUSED: 'Cliente recusou',
  WRONG_NUMBER: 'Contato inválido',
  CALLBACK_REQUESTED: 'Retorno agendado',
  OTHER: 'Outro',
};

export const ATTEMPT_CHANNEL_OPTIONS = [
  'PHONE',
  'WHATSAPP',
  'EMAIL',
  'SMS',
  'IN_PERSON',
  'OTHER',
] as const;

export const ATTEMPT_RESULT_OPTIONS = [
  'NO_ANSWER',
  'CONTACTED',
  'PROMISE_MADE',
  'REFUSED',
  'WRONG_NUMBER',
  'CALLBACK_REQUESTED',
  'OTHER',
] as const;

const INVOICE_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Em aberto',
  OVERDUE: 'Vencida',
  PAID: 'Paga',
  PARTIALLY_PAID: 'Parcialmente paga',
  CANCELLED: 'Cancelada',
};

const PROMISE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativa',
  FULFILLED: 'Cumprida',
  BROKEN: 'Descumprida',
  CANCELLED: 'Cancelada',
};

export function getAttemptChannelLabel(channel: string) {
  return ATTEMPT_CHANNEL_LABELS[channel] ?? channel;
}

export function getAttemptResultLabel(result: string) {
  return ATTEMPT_RESULT_LABELS[result] ?? result;
}

export function getInvoiceStatusLabel(status: string) {
  return INVOICE_STATUS_LABELS[status] ?? status;
}

export function getPromiseStatusLabel(status: string) {
  return PROMISE_STATUS_LABELS[status] ?? status;
}

export function getPromiseStatusVariant(status: string): StatusVariant {
  if (status === 'FULFILLED') {
    return 'success';
  }

  if (status === 'BROKEN') {
    return 'danger';
  }

  return 'neutral';
}

const ACTIVE_CANCELLATION_PROCESS_STATUSES = new Set([
  'PENDING',
  'IN_PROGRESS',
  'AWAITING_PROTOCOL',
  'AWAITING_PICKUP',
]);

const BLOCKED_SEND_TO_CANCELLATION_STATUSES = new Set([
  'CLOSED',
  'RECOVERED',
  'PAYMENT_MADE',
  'RENEGOTIATED',
  'CANCELLATION_IN_PROGRESS',
]);

const CANCELLATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  AWAITING_PROTOCOL: 'Aguardando protocolo',
  AWAITING_PICKUP: 'Aguardando retirada',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  FAILED: 'Falhou',
};

export function getCancellationStatusLabel(status: string) {
  return CANCELLATION_STATUS_LABELS[status] ?? status;
}

export function getCancellationStatusVariant(status: string): StatusVariant {
  if (status === 'COMPLETED') {
    return 'success';
  }

  if (status === 'FAILED' || status === 'CANCELLED') {
    return 'danger';
  }

  return 'neutral';
}

const CANCELLATION_STEP_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  SKIPPED: 'Ignorada',
  FAILED: 'Falhou',
};

export function getCancellationStepStatusLabel(status: string) {
  return CANCELLATION_STEP_STATUS_LABELS[status] ?? status;
}

export function getCancellationStepStatusVariant(
  status: string,
): StatusVariant {
  if (status === 'COMPLETED') {
    return 'success';
  }

  if (status === 'FAILED') {
    return 'danger';
  }

  return 'neutral';
}

export function canCompleteCancellationStep(status: string) {
  return status === 'PENDING' || status === 'IN_PROGRESS';
}

export function canSendCaseToCancellation(input: {
  status: string;
  cancellationProcess: { status: string } | null;
}) {
  if (BLOCKED_SEND_TO_CANCELLATION_STATUSES.has(input.status)) {
    return false;
  }

  if (
    input.cancellationProcess &&
    ACTIVE_CANCELLATION_PROCESS_STATUSES.has(input.cancellationProcess.status)
  ) {
    return false;
  }

  return true;
}

// Casos na esteira de cancelamento podem ser revertidos para recuperado.
const REVERTIBLE_COLLECTION_STATUSES = new Set([
  'ELIGIBLE_FOR_CANCELLATION',
  'CANCELLATION_IN_PROGRESS',
]);

export function canRevertCaseCancellation(status: string) {
  return REVERTIBLE_COLLECTION_STATUSES.has(status);
}

const TIMELINE_EVENT_LABELS: Record<string, string> = {
  CASE_CREATED: 'Caso criado',
  ATTEMPT_CREATED: 'Tentativa',
  PAYMENT_PROMISE_CREATED: 'Promessa registrada',
  PAYMENT_PROMISE_FULFILLED: 'Promessa cumprida',
  PAYMENT_PROMISE_BROKEN: 'Promessa descumprida',
  PAYMENT_PROMISE_CANCELLED: 'Promessa cancelada',
  CASE_SENT_TO_CANCELLATION: 'Encaminhado para cancelamento',
  CANCELLATION_STEP_COMPLETED: 'Etapa concluída',
  CANCELLATION_PROCESS_COMPLETED: 'Cancelamento concluído',
  AUDIT_EVENT: 'Auditoria',
};

export function getTimelineEventLabel(type: string) {
  return TIMELINE_EVENT_LABELS[type] ?? type;
}

export function getTimelineEventVariant(type: string): StatusVariant {
  if (
    type === 'PAYMENT_PROMISE_FULFILLED' ||
    type === 'CANCELLATION_STEP_COMPLETED' ||
    type === 'CANCELLATION_PROCESS_COMPLETED'
  ) {
    return 'success';
  }

  if (type === 'PAYMENT_PROMISE_BROKEN') {
    return 'danger';
  }

  return 'neutral';
}
