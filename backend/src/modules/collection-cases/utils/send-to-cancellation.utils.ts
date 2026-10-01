export const ACTIVE_CANCELLATION_PROCESS_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'AWAITING_PROTOCOL',
  'AWAITING_PICKUP',
] as const;

export const BLOCKED_COLLECTION_STATUSES_FOR_CANCELLATION = [
  'CLOSED',
  'RECOVERED',
  'PAYMENT_MADE',
  'RENEGOTIATED',
  'CANCELLATION_IN_PROGRESS',
] as const;

export function hasActiveCancellationProcess(
  processes: { status: string }[],
): boolean {
  return processes.some((process) =>
    ACTIVE_CANCELLATION_PROCESS_STATUSES.includes(
      process.status as (typeof ACTIVE_CANCELLATION_PROCESS_STATUSES)[number],
    ),
  );
}

export function canSendCollectionCaseToCancellation(status: string): boolean {
  return !BLOCKED_COLLECTION_STATUSES_FOR_CANCELLATION.includes(
    status as (typeof BLOCKED_COLLECTION_STATUSES_FOR_CANCELLATION)[number],
  );
}
