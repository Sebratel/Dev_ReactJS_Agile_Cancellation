import { PaymentPromiseStatus } from '@prisma/client';
import type { PaymentPromiseStatusAction } from '@/modules/collection-cases/repositories/collection-cases.repository';

const ACTION_TO_STATUS: Record<
  PaymentPromiseStatusAction,
  PaymentPromiseStatus
> = {
  FULFILLED: PaymentPromiseStatus.FULFILLED,
  BROKEN: PaymentPromiseStatus.BROKEN,
  CANCELLED: PaymentPromiseStatus.CANCELLED,
};

export function resolvePaymentPromiseTargetStatus(
  action: PaymentPromiseStatusAction,
): PaymentPromiseStatus {
  return ACTION_TO_STATUS[action];
}

export function buildPaymentPromiseStatusUpdateData(
  action: PaymentPromiseStatusAction,
  now: Date,
) {
  const status = resolvePaymentPromiseTargetStatus(action);

  if (action === 'FULFILLED') {
    return { status, fulfilledAt: now };
  }

  if (action === 'BROKEN') {
    return { status, brokenAt: now };
  }

  return { status, cancelledAt: now };
}

export function mergePaymentPromiseNotes(
  currentNotes: string | null,
  updateNotes?: string,
) {
  if (!updateNotes?.trim()) {
    return currentNotes;
  }

  const trimmed = updateNotes.trim();

  if (!currentNotes?.trim()) {
    return trimmed;
  }

  return `${currentNotes}\n${trimmed}`;
}
