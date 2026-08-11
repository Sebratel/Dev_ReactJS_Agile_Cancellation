import { useQuery } from '@tanstack/react-query';
import { getPaymentPromises } from '@/features/payment-promises/services/payment-promises.service';
import { type PaymentPromisesListParams } from '@/features/payment-promises/types/payment-promises-api.types';
import { queryKeys } from '@/services/api/query-keys';

export function usePaymentPromises(
  params?: PaymentPromisesListParams & { enabled?: boolean },
) {
  const { enabled = true, ...queryParams } = params ?? {};
  return useQuery({
    queryKey: queryKeys.paymentPromises.list(queryParams),
    queryFn: () => getPaymentPromises(queryParams),
    enabled,
  });
}
