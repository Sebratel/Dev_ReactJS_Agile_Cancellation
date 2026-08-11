import { CancellationStepStatus } from '@prisma/client';
import type { CancellationStepResponse } from '@/modules/cancellations/dto/cancellation-step.response';
import { getCancellationStepLabel } from '@/modules/cancellations/constants/default-cancellation-steps.constants';

type StepLike = {
  id: string;
  cancellationProcessId: string;
  name: string;
  stepOrder: number;
  status: string;
  externalId?: string | null;
  completedAt?: Date | string | null;
  metadata?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function mapCancellationStepToResponse(
  step: StepLike,
  cancellationProcessId: string,
): CancellationStepResponse {
  const metadata = asRecord(step.metadata);

  return {
    id: step.id,
    cancellationProcessId,
    stepCode: step.name,
    name: getCancellationStepLabel(step.name),
    stepOrder: step.stepOrder,
    status: step.status,
    externalProtocol: step.externalId ?? null,
    notes: typeof metadata?.notes === 'string' ? metadata.notes : null,
    completedAt:
      step.completedAt instanceof Date
        ? step.completedAt.toISOString()
        : step.completedAt
          ? String(step.completedAt)
          : null,
    completedByName:
      typeof metadata?.completedByName === 'string'
        ? metadata.completedByName
        : null,
  };
}

export function areAllCancellationStepsCompleted(
  steps: { status: string }[],
): boolean {
  return (
    steps.length > 0 &&
    steps.every((step) => step.status === CancellationStepStatus.COMPLETED)
  );
}
