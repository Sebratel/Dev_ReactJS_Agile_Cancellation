import { useQuery } from '@tanstack/react-query';
import { listBulkContactWhatsAppJobs } from '@/features/collection-cases/services/collection-cases.service';
import { type BulkContactWhatsAppJobResponse } from '@/features/collection-cases/types/collection-cases-api.types';
import { queryKeys } from '@/services/api/query-keys';

// Historico de envios em lote. Faz polling automatico enquanto algum job da
// pagina atual ainda estiver em andamento, para o progresso atualizar
// sozinho sem o supervisor precisar atualizar a tela.
export function useBulkContactWhatsAppJobsList(page: number, limit = 10) {
  return useQuery({
    queryKey: queryKeys.collectionCases.bulkContactWhatsAppJobsList(page),
    queryFn: () => listBulkContactWhatsAppJobs({ page, limit }),
    refetchInterval: (query) => {
      const data = query.state.data as
        | { items: BulkContactWhatsAppJobResponse[] }
        | undefined;
      const hasInFlight = data?.items.some((job) => job.status !== 'COMPLETED');
      return hasInFlight ? 3_000 : false;
    },
  });
}
