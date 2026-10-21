import { httpClient } from '@/services/api/http-client';
import {
  type PreCollectionDistributeResult,
  type PreCollectionListResponse,
} from '@/features/pre-collection/types/pre-collection-api.types';

export async function getPreCollection(
  daysWindow: number,
): Promise<PreCollectionListResponse> {
  const { data } = await httpClient.request<PreCollectionListResponse>({
    path: `/pre-collection?daysWindow=${daysWindow}`,
    method: 'GET',
  });
  return data;
}

export async function distributePreCollection(): Promise<PreCollectionDistributeResult> {
  const { data } = await httpClient.request<PreCollectionDistributeResult>({
    path: '/pre-collection/distribute',
    method: 'POST',
  });
  return data;
}
