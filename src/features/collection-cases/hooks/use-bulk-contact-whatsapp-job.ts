import { useQuery } from '@tanstack/react-query';
import { getBulkContactWhatsAppJob } from '@/features/collection-cases/services/collection-cases.service';
import { queryKeys } from '@/services/api/query-keys';

// Acompanha o progresso de um envio de HSM em lote ja criado, via polling —
// o processamento em si roda no worker do backend, aos poucos, entao a
// tela so precisa consultar o status periodicamente ate concluir.
export function useBulkContactWhatsAppJob(jobId: string | null) {
  return useQuery({
    queryKey: queryKeys.collectionCases.bulkContactWhatsAppJob(jobId ?? ''),
    queryFn: () => getBulkContactWhatsAppJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'COMPLETED' ? false : 2_000;
    },
  });
}
