import { httpClient } from '@/services/api/http-client';
import { type PreCollectionListResponse } from '@/features/pre-collection/types/pre-collection-api.types';

export async function getPreCollection(
  daysWindow: number,
): Promise<PreCollectionListResponse> {
  const { data } = await httpClient.request<PreCollectionListResponse>({
    path: `/pre-collection?daysWindow=${daysWindow}`,
    method: 'GET',
  });
  return data;
}
