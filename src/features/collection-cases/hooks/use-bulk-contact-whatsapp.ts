import { useMutation } from '@tanstack/react-query';
import { createBulkContactWhatsAppJob } from '@/features/collection-cases/services/collection-cases.service';

export function useBulkContactWhatsApp() {
  return useMutation({
    mutationFn: createBulkContactWhatsAppJob,
  });
}
