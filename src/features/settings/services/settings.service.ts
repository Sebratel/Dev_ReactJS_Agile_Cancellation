import type {
  AppSettings,
  UpdateSettingsPayload,
} from '@/features/settings/types/settings-api.types';
import { httpClient } from '@/services/api/http-client';

export async function getSettings() {
  const response = await httpClient.request<AppSettings>({
    path: '/settings',
    method: 'GET',
  });

  return response.data;
}

export async function updateSettings(payload: UpdateSettingsPayload) {
  const response = await httpClient.request<AppSettings>({
    path: '/settings',
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return response.data;
}
