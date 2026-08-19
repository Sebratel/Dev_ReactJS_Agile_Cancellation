import { useMutation } from '@tanstack/react-query';
import { createBulkContactWhatsAppJobByFilter } from '@/features/collection-cases/services/collection-cases.service';

export function useBulkContactWhatsAppByFilter() {
  return useMutation({
    mutationFn: createBulkContactWhatsAppJobByFilter,
  });
}
