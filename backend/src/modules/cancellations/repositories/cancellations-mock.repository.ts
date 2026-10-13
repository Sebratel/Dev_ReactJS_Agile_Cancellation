import { Injectable } from '@nestjs/common';
import {
  mockCollectionCaseDetails,
  pushMockAuditLog,
  resolveMockActorName,
} from '@/modules/collection-cases/mocks/collection-cases.mock';
import type { CollectionCaseCancellationStepSummary } from '@/modules/collection-cases/dto/collection-case-details.response';
import { COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED } from '@/modules/cancellations/constants/collection-case-closure.constants';
import { getCancellationStepLabel } from '@/modules/cancellations/constants/default-cancellation-steps.constants';
import type { CancellationStepResponse } from '@/modules/cancellations/dto/cancellation-step.response';
import type {
  CancellationProcessContextResult,
  CancellationsRepository,
  CompleteCancellationStepParams,
  CompleteCancellationStepResult,
  ElevenRequestEligibilityResult,
} from '@/modules/cancellations/repositories/cancellations.repository';
import { areAllCancellationStepsCompleted } from '@/modules/cancellations/utils/cancellation-step.utils';

type MockCancellationContext = {
  caseId: string;
  process: NonNullable<
    (typeof mockCollectionCaseDetails)[string]['cancellationProcess']
  >;
};

function findMockCancellationContext(
  cancellationId: string,
): MockCancellationContext | null {
  for (const [caseId, details] of Object.entries(mockCollectionCaseDetails)) {
    if (details.cancellationProcess?.id === cancellationId) {
      return {
        caseId,
        process: details.cancellationProcess,
      };
    }
  }

  return null;
}

function mapMockStepToResponse(
  step: CollectionCaseCancellationStepSummary,
  cancellationProcessId: string,
): CancellationStepResponse {
  return {
    id: step.id,
    cancellationProcessId,
    stepCode: step.stepCode,
    name: step.name,
    stepOrder: step.stepOrder,
    status: step.status,
    externalProtocol: step.externalProtocol,
    notes: null,
    completedAt: step.completedAt,
    completedByName: step.completedByName,
  };
}

@Injectable()
export class CancellationsMockRepository implements CancellationsRepository {
  getProcessContext(
    cancellationId: string,
  ): Promise<CancellationProcessContextResult> {
    const context = findMockCancellationContext(cancellationId);

    if (!context) {
      return Promise.resolve({ outcome: 'process_not_found' });
    }

    return Promise.resolve({
      outcome: 'found',
      context: {
        cancellationId,
        processStatus: context.process.status,
        caseAssignedUserId:
          mockCollectionCaseDetails[context.caseId]?.assignedTo?.id ?? null,
        steps: context.process.steps.map((step) => ({
          stepCode: step.stepCode,
          stepOrder: step.stepOrder,
          status: step.status,
        })),
      },
    });
  }

  validateElevenRequestEligibility(
    cancellationId: string,
  ): Promise<ElevenRequestEligibilityResult> {
    const context = findMockCancellationContext(cancellationId);

    if (!context) {
      return Promise.resolve({ outcome: 'process_not_found' });
    }

    if (context.process.status === 'COMPLETED') {
      return Promise.resolve({ outcome: 'process_already_completed' });
    }

    const step = context.process.steps.find(
      (item) => item.stepCode === 'OPEN_ELEVEN_REQUEST',
    );

    if (!step) {
      return Promise.resolve({ outcome: 'step_not_found' });
    }

    if (step.status === 'COMPLETED') {
      return Promise.resolve({ outcome: 'step_already_completed' });
    }

    return Promise.resolve({ outcome: 'eligible' });
  }

  completeStep({
    cancellationId,
    stepCode,
    input,
    performedByUserId,
    performedByName,
    integrationMetadata,
  }: CompleteCancellationStepParams): Promise<CompleteCancellationStepResult> {
    const context = findMockCancellationContext(cancellationId);

    if (!context) {
      return Promise.resolve({ outcome: 'process_not_found' });
    }

    const details = mockCollectionCaseDetails[context.caseId];

    if (!details?.cancellationProcess) {
      return Promise.resolve({ outcome: 'process_not_found' });
    }

    const step = details.cancellationProcess.steps.find(
      (item) => item.stepCode === stepCode,
    );

    if (!step) {
      return Promise.resolve({ outcome: 'step_not_found' });
    }

    if (step.status === 'COMPLETED') {
      return Promise.resolve({ outcome: 'step_already_completed' });
    }

    const completedAt = input.completedAt ?? new Date().toISOString();
    const now = new Date().toISOString();
    const actorName =
      performedByName ??
      resolveMockActorName(performedByUserId) ??
      'Usuario mockado';

    step.status = 'COMPLETED';
    step.completedAt = completedAt;
    step.externalProtocol = input.externalProtocol ?? null;
    step.completedByName = actorName;
    details.updatedAt = now;

    if (details.cancellationProcess.status === 'PENDING') {
      details.cancellationProcess.status = 'IN_PROGRESS';
    }

    details.cancellationProcess.completedAt = null;

    pushMockAuditLog({
      entityType: 'COLLECTION_CASE',
      entityId: context.caseId,
      action: 'STATUS_CHANGE',
      performedByUserId,
      beforeSnapshot: {
        stepCode: step.stepCode,
        status: 'PENDING',
      },
      afterSnapshot: {
        stepCode: step.stepCode,
        status: 'COMPLETED',
        completedAt,
        externalProtocol: step.externalProtocol,
      },
      metadata: {
        cancellationProcessId: cancellationId,
        stepId: step.id,
        stepCode: step.stepCode,
        resourceType: 'CANCELLATION_STEP',
        action: 'COMPLETED',
        notes: input.notes ?? null,
        ...integrationMetadata,
      },
    });

    const allCompleted = areAllCancellationStepsCompleted(
      details.cancellationProcess.steps,
    );

    if (allCompleted) {
      details.cancellationProcess.status = 'COMPLETED';
      details.cancellationProcess.completedAt = now;
      details.status = COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED;
      details.updatedAt = now;

      pushMockAuditLog({
        entityType: 'COLLECTION_CASE',
        entityId: context.caseId,
        action: 'STATUS_CHANGE',
        performedByUserId,
        beforeSnapshot: {
          status: 'CANCELLATION_IN_PROGRESS',
          cancellationProcess: {
            id: cancellationId,
            status: 'IN_PROGRESS',
          },
        },
        afterSnapshot: {
          status: COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED,
          cancellationProcess: {
            id: cancellationId,
            status: 'COMPLETED',
            completedAt: now,
          },
        },
        metadata: {
          cancellationProcessId: cancellationId,
          resourceType: 'CANCELLATION_PROCESS',
          action: 'COMPLETED',
        },
      });
    }

    const response = mapMockStepToResponse(step, cancellationId);

    return Promise.resolve({
      outcome: 'success',
      step: {
        ...response,
        name: getCancellationStepLabel(step.stepCode),
        notes: input.notes ?? null,
      },
      processCompleted: allCompleted,
    });
  }
}
