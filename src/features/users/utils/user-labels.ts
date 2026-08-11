import { type StatusVariant } from '@/types/ui';
import { type UserRole } from '@/types/auth';
import { type UserStatus } from '@/features/users/types/users-api.types';

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  BLOCKED: 'Bloqueado',
  PENDING_ACTIVATION: 'Pendente',
};

const STATUS_VARIANTS: Record<UserStatus, StatusVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  BLOCKED: 'danger',
  PENDING_ACTIVATION: 'neutral',
};

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  FINANCE: 'Financeiro',
  COLLECTION_AGENT: 'Agente de cobrança',
  CANCELLATION_AGENT: 'Agente de cancelamento',
  VIEWER: 'Visualizador',
};

export function getUserStatusLabel(status: UserStatus): string {
  return STATUS_LABELS[status];
}

export function getUserStatusVariant(status: UserStatus): StatusVariant {
  return STATUS_VARIANTS[status];
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}
