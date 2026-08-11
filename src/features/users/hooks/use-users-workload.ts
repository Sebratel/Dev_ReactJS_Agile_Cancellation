import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { getUsersWorkload } from '@/features/users/services/users.service';

export function useUsersWorkload(enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.workload,
    queryFn: getUsersWorkload,
    enabled,
  });
}
