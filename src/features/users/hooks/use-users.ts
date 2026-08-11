import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { getUsers } from '@/features/users/services/users.service';
import { type UsersListParams } from '@/features/users/types/users-api.types';

export function useUsers(params: UsersListParams & { enabled?: boolean }) {
  const queryParams: UsersListParams = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    status: params.status,
    role: params.role,
    search: params.search,
  };

  return useQuery({
    queryKey: queryKeys.users.list(queryParams),
    queryFn: () => getUsers(queryParams),
    enabled: params.enabled ?? true,
  });
}
