// Somente casos na esteira de cancelamento podem ser revertidos para recuperado.
export const REVERTIBLE_COLLECTION_STATUSES = [
  'ELIGIBLE_FOR_CANCELLATION',
  'CANCELLATION_IN_PROGRESS',
] as const;

// Processos de cancelamento ainda ativos que devem ser abortados ao reverter.
export const REVERSIBLE_CANCELLATION_PROCESS_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'AWAITING_PROTOCOL',
  'AWAITING_PICKUP',
] as const;

export function canRevertCancellation(status: string): boolean {
  return REVERTIBLE_COLLECTION_STATUSES.includes(
    status as (typeof REVERTIBLE_COLLECTION_STATUSES)[number],
  );
}

export function isReversibleCancellationProcess(status: string): boolean {
  return REVERSIBLE_CANCELLATION_PROCESS_STATUSES.includes(
    status as (typeof REVERSIBLE_CANCELLATION_PROCESS_STATUSES)[number],
  );
}
