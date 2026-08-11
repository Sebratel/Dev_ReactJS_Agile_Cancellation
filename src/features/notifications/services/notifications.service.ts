import { httpClient } from '@/services/api/http-client';
import type { PaginatedResponse } from '@/services/api/types/api-envelope';
import type {
  NotificationResponse,
  NotificationsListParams,
} from '@/features/notifications/types/notifications-api.types';

function buildPath(params?: NotificationsListParams): string {
  const q = new URLSearchParams();
  if (params?.unreadOnly) q.set('unreadOnly', 'true');
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return qs ? `/notifications?${qs}` : '/notifications';
}

export async function getNotifications(
  params?: NotificationsListParams,
): Promise<PaginatedResponse<NotificationResponse>> {
  const { data } = await httpClient.request<PaginatedResponse<NotificationResponse>>({
    path: buildPath(params),
    method: 'GET',
  });
  return data;
}

export async function getUnreadNotificationsCount(): Promise<{ count: number }> {
  const { data } = await httpClient.request<{ count: number }>({
    path: '/notifications/unread-count',
    method: 'GET',
  });
  return data;
}

export async function markNotificationAsRead(id: string): Promise<NotificationResponse> {
  const { data } = await httpClient.request<NotificationResponse>({
    path: `/notifications/${id}/read`,
    method: 'PATCH',
  });
  return data;
}

export async function markAllNotificationsAsRead(): Promise<{ count: number }> {
  const { data } = await httpClient.request<{ count: number }>({
    path: '/notifications/read-all',
    method: 'PATCH',
  });
  return data;
}
