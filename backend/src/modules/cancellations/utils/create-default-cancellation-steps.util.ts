import { CancellationStepStatus } from '@prisma/client';
import { DEFAULT_CANCELLATION_STEP_DEFINITIONS } from '@/modules/cancellations/constants/default-cancellation-steps.constants';
import type { CollectionCaseCancellationStepSummary } from '@/modules/collection-cases/dto/collection-case-details.response';

export function buildDefaultCancellationStepsForPrisma(
  cancellationProcessId: string,
) {
  return DEFAULT_CANCELLATION_STEP_DEFINITIONS.map((definition) => ({
    cancellationProcessId,
    name: definition.stepCode,
    stepOrder: definition.stepOrder,
    status: CancellationStepStatus.PENDING,
  }));
}

export function buildDefaultCancellationStepsForMock(
  cancellationProcessId: string,
): CollectionCaseCancellationStepSummary[] {
  return DEFAULT_CANCELLATION_STEP_DEFINITIONS.map((definition, index) => ({
    id: `${cancellationProcessId}_step_${String(index + 1).padStart(2, '0')}`,
    stepCode: definition.stepCode,
    name: definition.name,
    stepOrder: definition.stepOrder,
    status: 'PENDING',
    externalProtocol: null,
    completedAt: null,
    completedByName: null,
  }));
}
