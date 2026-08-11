import { useQuery } from '@tanstack/react-query';
import { getUnreadNotificationsCount } from '@/features/notifications/services/notifications.service';
import { queryKeys } from '@/services/api/query-keys';

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: getUnreadNotificationsCount,
    refetchInterval: 30_000,
  });
}
