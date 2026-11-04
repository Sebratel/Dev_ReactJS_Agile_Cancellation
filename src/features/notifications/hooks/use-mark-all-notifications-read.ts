import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAllNotificationsAsRead } from '@/features/notifications/services/notifications.service';
import { queryKeys } from '@/services/api/query-keys';

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}
