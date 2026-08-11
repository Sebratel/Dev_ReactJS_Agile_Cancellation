import type { PaymentPromise } from '@prisma/client';
import { formatDecimal } from '@/common/utils/decimal.util';
import type { PaymentPromiseResponse } from '@/modules/collection-cases/dto/payment-promise.response';

export function mapPaymentPromiseToResponse(
  promise: PaymentPromise,
  createdByUserId: string | null = null,
): PaymentPromiseResponse {
  return {
    id: promise.id,
    collectionCaseId: promise.collectionCaseId,
    status: promise.status,
    promisedAmount: formatDecimal(promise.promisedAmount),
    promisedDate: promise.promisedDate.toISOString(),
    notes: promise.notes,
    fulfilledAt: promise.fulfilledAt?.toISOString() ?? null,
    brokenAt: promise.brokenAt?.toISOString() ?? null,
    cancelledAt: promise.cancelledAt?.toISOString() ?? null,
    createdAt: promise.createdAt.toISOString(),
    createdByUserId,
  };
}
