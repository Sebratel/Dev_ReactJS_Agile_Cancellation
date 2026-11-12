import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { getCancellationAgents } from '@/features/users/services/users.service';

// Agentes de cancelamento ativos — quem pode receber um caso encaminhado ao
// cancelamento. Usa a rota dedicada porque a listagem geral de usuarios nao e
// permitida ao atendente de cobranca (dava 403 e a lista vinha vazia).
export function useCancellationAgents(enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.cancellationAgents,
    queryFn: getCancellationAgents,
    enabled,
  });
}
