import type { CollectionCaseCancellationStepSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import { canCompleteCancellationStep } from '@/features/collection-cases/utils/collection-case-labels';
import type { UserRole } from '@/types/auth';

const FINANCE_STEP_CODES = new Set(['LOWER_TITLES', 'APPLY_FINE']);

const CANCELLATION_OPERATION_STEP_CODES = new Set([
  'ROUTE_PROTOCOL',
  'SEND_WITHDRAWAL_PROTOCOL',
  'WAITING_EQUIPMENT_RETURN',
  'EQUIPMENT_RETURNED',
  'CANCELLATION_COMPLETED',
]);

const ELEVEN_STEP_CODE = 'OPEN_ELEVEN_REQUEST';

const ELEVATED_ROLES = new Set<UserRole>(['ADMIN', 'SUPERVISOR']);

export type CancellationStepActionKind =
  | 'available'
  | 'disabled'
  | 'hidden'
  | 'completed';

export type CancellationStepActionState = {
  kind: CancellationStepActionKind;
  blockReason?: string;
  isNextPending: boolean;
  useElevenAction: boolean;
};

function sortSteps(steps: CollectionCaseCancellationStepSummary[]) {
  return [...steps].sort((left, right) => left.stepOrder - right.stepOrder);
}

export function getNextPendingCancellationStep(
  steps: CollectionCaseCancellationStepSummary[],
) {
  return sortSteps(steps).find((step) =>
    canCompleteCancellationStep(step.status),
  );
}

function getPreviousIncompleteStep(
  steps: CollectionCaseCancellationStepSummary[],
  targetStepCode: string,
) {
  const sortedSteps = sortSteps(steps);
  const targetIndex = sortedSteps.findIndex(
    (step) => step.stepCode === targetStepCode,
  );

  if (targetIndex <= 0) {
    return null;
  }

  for (let index = 0; index < targetIndex; index += 1) {
    const step = sortedSteps[index];

    if (step && step.status !== 'COMPLETED' && step.status !== 'SKIPPED') {
      return step;
    }
  }

  return null;
}

export function canUserCompleteCancellationStep(
  userRoles: UserRole[],
  stepCode: string,
) {
  if (userRoles.some((role) => ELEVATED_ROLES.has(role))) {
    return true;
  }

  if (FINANCE_STEP_CODES.has(stepCode)) {
    return userRoles.includes('FINANCE');
  }

  if (stepCode === ELEVEN_STEP_CODE) {
    return userRoles.includes('CANCELLATION_AGENT');
  }

  if (CANCELLATION_OPERATION_STEP_CODES.has(stepCode)) {
    return userRoles.includes('CANCELLATION_AGENT');
  }

  return false;
}

function getStepLabel(
  stepCode: string,
  steps: CollectionCaseCancellationStepSummary[],
) {
  return steps.find((step) => step.stepCode === stepCode)?.name ?? stepCode;
}

export function resolveCancellationStepActionState(input: {
  step: CollectionCaseCancellationStepSummary;
  steps: CollectionCaseCancellationStepSummary[];
  processStatus: string;
  userRoles: UserRole[];
}): CancellationStepActionState {
  const nextPendingStep = getNextPendingCancellationStep(input.steps);
  const isNextPending = nextPendingStep?.stepCode === input.step.stepCode;
  const useElevenAction = input.step.stepCode === ELEVEN_STEP_CODE;

  if (!canCompleteCancellationStep(input.step.status)) {
    return {
      kind: 'completed',
      isNextPending: false,
      useElevenAction,
    };
  }

  if (input.processStatus === 'COMPLETED') {
    return {
      kind: 'disabled',
      blockReason: 'Processo de cancelamento já foi concluído.',
      isNextPending: false,
      useElevenAction,
    };
  }

  if (!canUserCompleteCancellationStep(input.userRoles, input.step.stepCode)) {
    return {
      kind: 'hidden',
      isNextPending: false,
      useElevenAction,
    };
  }

  const blockingStep = getPreviousIncompleteStep(
    input.steps,
    input.step.stepCode,
  );

  if (blockingStep) {
    return {
      kind: 'disabled',
      blockReason: `Conclua antes a etapa "${getStepLabel(blockingStep.stepCode, input.steps)}".`,
      isNextPending: false,
      useElevenAction,
    };
  }

  return {
    kind: 'available',
    isNextPending,
    useElevenAction,
  };
}

export function getCancellationStepRowClassName(
  actionState: CancellationStepActionState,
) {
  if (actionState.isNextPending) {
    return 'bg-muted/60 ring-1 ring-inset ring-border';
  }

  return undefined;
}
