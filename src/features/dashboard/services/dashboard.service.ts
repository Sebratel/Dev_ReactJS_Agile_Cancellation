import { httpClient } from '@/services/api/http-client';
import {
  type DashboardOperationsResponse,
  type DashboardSummaryResponse,
} from '@/features/dashboard/types/dashboard-api.types';

export async function getDashboardSummary() {
  const response = await httpClient.request<DashboardSummaryResponse>({
    path: '/dashboard/summary',
  });

  return response.data;
}

export async function getDashboardOperations() {
  const response = await httpClient.request<DashboardOperationsResponse>({
    path: '/dashboard/operations',
  });

  return response.data;
}
