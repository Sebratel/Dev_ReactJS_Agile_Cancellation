import {
  DEFAULT_CANCELLATION_STEP_DEFINITIONS,
  type DefaultCancellationStepCode,
} from '@/modules/cancellations/constants/default-cancellation-steps.constants';
import type { RoleCode } from '@/modules/auth/constants/role-codes.constants';
import type { ElevenMode } from '@/config/eleven.config';
import {
  throwCancellationAlreadyCompleted,
  throwStepOutOfOrder,
  throwStepPermissionDenied,
  throwStepRequiresIntegration,
} from '@/modules/cancellations/errors/cancellation-step-policy.exception';

export type CancellationProcessStepSnapshot = {
  stepCode: string;
  stepOrder: number;
  status: string;
};

export type CancellationProcessContext = {
  cancellationId: string;
  processStatus: string;
  steps: CancellationProcessStepSnapshot[];
};

export type CancellationStepCompletionSource = 'generic' | 'eleven';

const FINANCE_STEP_CODES = new Set<DefaultCancellationStepCode>([
  'LOWER_TITLES',
  'APPLY_FINE',
]);

const CANCELLATION_OPERATION_STEP_CODES = new Set<DefaultCancellationStepCode>([
  'ROUTE_PROTOCOL',
  'SEND_WITHDRAWAL_PROTOCOL',
  'WAITING_EQUIPMENT_RETURN',
  'EQUIPMENT_RETURNED',
  'CANCELLATION_COMPLETED',
]);

const ELEVEN_INTEGRATION_STEP_CODE = 'OPEN_ELEVEN_REQUEST';

const ELEVATED_ROLES = new Set<RoleCode>(['ADMIN', 'SUPERVISOR']);

const FINANCE_ROLES = new Set<RoleCode>(['FINANCE']);

const CANCELLATION_ROLES = new Set<RoleCode>(['CANCELLATION_AGENT']);

export function sortCancellationSteps(
  steps: CancellationProcessStepSnapshot[],
) {
  return [...steps].sort((left, right) => left.stepOrder - right.stepOrder);
}

export function getNextPendingCancellationStep(
  steps: CancellationProcessStepSnapshot[],
) {
  return sortCancellationSteps(steps).find(
    (step) => step.status === 'PENDING' || step.status === 'IN_PROGRESS',
  );
}

export function getPreviousIncompleteStep(
  steps: CancellationProcessStepSnapshot[],
  targetStepCode: string,
) {
  const sortedSteps = sortCancellationSteps(steps);
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

/**
 * OPEN_ELEVEN_REQUEST nunca pode ser concluida via endpoint generico,
 * independentemente de ELEVEN_MODE (stub, live ou disabled).
 * Em disabled, o endpoint Eleven retorna 503 e a etapa permanece bloqueada.
 */
export function stepRequiresIntegrationCompletion(stepCode: string) {
  return stepCode === ELEVEN_INTEGRATION_STEP_CODE;
}

export function canRoleCompleteCancellationStep(
  roles: RoleCode[],
  stepCode: string,
) {
  if (roles.some((role) => ELEVATED_ROLES.has(role))) {
    return true;
  }

  if (FINANCE_STEP_CODES.has(stepCode as DefaultCancellationStepCode)) {
    return roles.some((role) => FINANCE_ROLES.has(role));
  }

  if (stepCode === ELEVEN_INTEGRATION_STEP_CODE) {
    return roles.some((role) => CANCELLATION_ROLES.has(role));
  }

  if (
    CANCELLATION_OPERATION_STEP_CODES.has(
      stepCode as DefaultCancellationStepCode,
    )
  ) {
    return roles.some((role) => CANCELLATION_ROLES.has(role));
  }

  return false;
}

export function assertCancellationProcessIsOpen(
  context: CancellationProcessContext,
) {
  if (context.processStatus === 'COMPLETED') {
    throwCancellationAlreadyCompleted(context.cancellationId);
  }
}

export function assertCancellationStepInOrder(
  context: CancellationProcessContext,
  stepCode: string,
) {
  const blockingStep = getPreviousIncompleteStep(context.steps, stepCode);

  if (blockingStep) {
    throwStepOutOfOrder(blockingStep.stepCode, stepCode);
  }
}

export function assertCancellationStepPermission(
  roles: RoleCode[],
  stepCode: string,
) {
  if (!canRoleCompleteCancellationStep(roles, stepCode)) {
    throwStepPermissionDenied(stepCode);
  }
}

export function assertCancellationStepCompletionAllowed(input: {
  context: CancellationProcessContext;
  stepCode: string;
  roles: RoleCode[];
  completionSource: CancellationStepCompletionSource;
  elevenMode: ElevenMode | 'live';
}) {
  assertCancellationProcessIsOpen(input.context);
  assertCancellationStepInOrder(input.context, input.stepCode);
  assertCancellationStepPermission(input.roles, input.stepCode);

  if (
    input.completionSource === 'generic' &&
    stepRequiresIntegrationCompletion(input.stepCode)
  ) {
    throwStepRequiresIntegration(input.stepCode);
  }
}

export function getCancellationStepDefinition(stepCode: string) {
  return DEFAULT_CANCELLATION_STEP_DEFINITIONS.find(
    (definition) => definition.stepCode === stepCode,
  );
}
