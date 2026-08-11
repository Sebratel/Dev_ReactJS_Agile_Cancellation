import { httpClient } from '@/services/api/http-client';
import {
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
