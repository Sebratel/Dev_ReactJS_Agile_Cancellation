import { useUsers } from '@/features/users/hooks/use-users';

// Agentes de cancelamento ativos — quem pode receber um caso encaminhado ao
// cancelamento. Usado nos fluxos de "enviar para cancelamento".
export function useCancellationAgents(enabled = true) {
  return useUsers({
    status: 'ACTIVE',
    role: 'CANCELLATION_AGENT',
    limit: 100,
    enabled,
  });
}
