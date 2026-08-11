import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '@/features/auditoria/services/auditoria.service';
import { type AuditLogsListParams } from '@/features/auditoria/types/auditoria-api.types';
import { queryKeys } from '@/services/api/query-keys';

export function useAuditLogs(params: AuditLogsListParams) {
  return useQuery({
    queryKey: queryKeys.auditoria.list(params),
    queryFn: () => getAuditLogs(params),
  });
}
