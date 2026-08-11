import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from '@/features/users/services/users.service';
import { type CreateUserPayload } from '@/features/users/types/users-api.types';
import { queryKeys } from '@/services/api/query-keys';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.users.all,
      });
    },
  });
}
