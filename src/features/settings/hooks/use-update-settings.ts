import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSettings } from '@/features/settings/services/settings.service';
import { type AppSettings } from '@/features/settings/types/settings-api.types';
import { queryKeys } from '@/services/api/query-keys';

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings: AppSettings) => {
      queryClient.setQueryData(queryKeys.settings.all, settings);
    },
  });
}
