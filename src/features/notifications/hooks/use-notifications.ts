import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '@/features/notifications/services/notifications.service';
import { type NotificationsListParams } from '@/features/notifications/types/notifications-api.types';
import { queryKeys } from '@/services/api/query-keys';

export function useNotifications(params?: NotificationsListParams) {
  const queryParams = params ?? {};
  return useQuery({
    queryKey: queryKeys.notifications.list(queryParams),
    queryFn: () => getNotifications(queryParams),
    refetchInterval: 30_000,
  });
}
