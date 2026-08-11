import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUser } from '@/features/users/services/users.service';
import { type UpdateUserPayload } from '@/features/users/types/users-api.types';
import { queryKeys } from '@/services/api/query-keys';

type UpdateUserVariables = {
  id: string;
  payload: UpdateUserPayload;
};

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateUserVariables) =>
      updateUser(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.users.all,
      });
    },
  });
}
