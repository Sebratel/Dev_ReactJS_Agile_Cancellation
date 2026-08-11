import type { ElevenIntegrationStatus } from '@/features/integrations/types/integrations-api.types';
import { httpClient } from '@/services/api/http-client';

export async function getElevenIntegrationStatus() {
  const response = await httpClient.request<ElevenIntegrationStatus>({
    path: '/integrations/eleven/status',
    method: 'GET',
  });

  return response.data;
}
