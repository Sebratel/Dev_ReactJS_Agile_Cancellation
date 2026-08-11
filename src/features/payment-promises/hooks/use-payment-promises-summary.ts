import { useQuery } from '@tanstack/react-query';
import { getPaymentPromisesSummary } from '@/features/payment-promises/services/payment-promises.service';
import { queryKeys } from '@/services/api/query-keys';

export function usePaymentPromisesSummary() {
  return useQuery({
    queryKey: queryKeys.paymentPromises.summary,
    queryFn: getPaymentPromisesSummary,
  });
}
