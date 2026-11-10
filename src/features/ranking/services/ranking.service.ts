import { httpClient } from '@/services/api/http-client';
import {
  type RecoveryAuditResponse,
  type RecoveryRankingPeriod,
  type RecoveryRankingResponse,
} from '@/features/ranking/types/ranking-api.types';

export async function getRecoveryRanking(period: RecoveryRankingPeriod) {
  const searchParams = new URLSearchParams({ period });
  const response = await httpClient.request<RecoveryRankingResponse>({
    path: `/dashboard/recovery-ranking?${searchParams.toString()}`,
  });

  return response.data;
}

// Conferência do crédito de um atendente (só supervisão/admin): pagamento no
// ERP, contatos e verificações de cada recuperação do período.
export async function getRecoveryAudit(
  userId: string,
  period: RecoveryRankingPeriod,
) {
  const searchParams = new URLSearchParams({ period });
  const response = await httpClient.request<RecoveryAuditResponse>({
    path: `/erp/recovery-audit/${encodeURIComponent(userId)}?${searchParams.toString()}`,
  });

  return response.data;
}
