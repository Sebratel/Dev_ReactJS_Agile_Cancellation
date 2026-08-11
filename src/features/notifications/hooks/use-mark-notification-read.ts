import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markNotificationAsRead } from '@/features/notifications/services/notifications.service';
import { queryKeys } from '@/services/api/query-keys';

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
