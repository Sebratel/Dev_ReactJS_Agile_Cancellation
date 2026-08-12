import { type StatusVariant } from '@/types/ui';

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  OPEN: 'Em aberto',
  PAID: 'Paga',
  PARTIALLY_PAID: 'Parcialmente paga',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
  WRITTEN_OFF: 'Baixada',
};

const INVOICE_STATUS_VARIANTS: Record<string, StatusVariant> = {
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'neutral',
  WRITTEN_OFF: 'neutral',
  DRAFT: 'neutral',
  OPEN: 'warning',
  PARTIALLY_PAID: 'warning',
};

const CONTRACT_STATUS_VARIANTS: Record<string, StatusVariant> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  TERMINATED: 'neutral',
  CANCELLED: 'danger',
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Bloqueio Financeiro',
  TERMINATED: 'Encerrado',
  CANCELLED: 'Cancelado',
};

export function getInvoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABELS[status] ?? status;
}

export function getInvoiceStatusVariant(status: string): StatusVariant {
  return INVOICE_STATUS_VARIANTS[status] ?? 'neutral';
}

export function getContractStatusLabel(status: string): string {
  return CONTRACT_STATUS_LABELS[status] ?? status;
}

export function getContractStatusVariant(status: string): StatusVariant {
  return CONTRACT_STATUS_VARIANTS[status] ?? 'neutral';
}
