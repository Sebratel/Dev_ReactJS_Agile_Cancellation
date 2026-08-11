import { type UserRole } from '@/types/auth';

export const authStorageKey = 'ger.auth.session';

export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  FINANCE: 'Financeiro',
  COLLECTION_AGENT: 'Agente de cobrança',
  CANCELLATION_AGENT: 'Agente de cancelamento',
  VIEWER: 'Visualização',
};
