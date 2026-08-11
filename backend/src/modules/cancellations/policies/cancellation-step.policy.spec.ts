import {
  assertCancellationStepCompletionAllowed,
  canRoleCompleteCancellationStep,
  getNextPendingCancellationStep,
  getPreviousIncompleteStep,
  stepRequiresIntegrationCompletion,
} from '@/modules/cancellations/policies/cancellation-step.policy';
import { CancellationStepPolicyException } from '@/modules/cancellations/errors/cancellation-step-policy.exception';
import { CANCELLATION_STEP_ERROR_CODES } from '@/modules/cancellations/errors/cancellation-step-error.constants';

const baseSteps = [
  { stepCode: 'LOWER_TITLES', stepOrder: 1, status: 'PENDING' },
  { stepCode: 'APPLY_FINE', stepOrder: 2, status: 'PENDING' },
  { stepCode: 'OPEN_ELEVEN_REQUEST', stepOrder: 3, status: 'PENDING' },
  { stepCode: 'ROUTE_PROTOCOL', stepOrder: 4, status: 'PENDING' },
];

const baseContext = {
  cancellationId: 'can_0001',
  processStatus: 'IN_PROGRESS',
  steps: baseSteps,
};

describe('cancellation-step.policy', () => {
  it('identifica proxima etapa pendente', () => {
    expect(getNextPendingCancellationStep(baseSteps)?.stepCode).toBe(
      'LOWER_TITLES',
    );
  });

  it('bloqueia etapa fora de ordem', () => {
    expect(() =>
      assertCancellationStepCompletionAllowed({
        context: baseContext,
        stepCode: 'APPLY_FINE',
        roles: ['FINANCE'],
        completionSource: 'generic',
        elevenMode: 'stub',
      }),
    ).toThrow(CancellationStepPolicyException);

    try {
      assertCancellationStepCompletionAllowed({
        context: baseContext,
        stepCode: 'APPLY_FINE',
        roles: ['FINANCE'],
        completionSource: 'generic',
        elevenMode: 'stub',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CancellationStepPolicyException);
      expect((error as CancellationStepPolicyException).getResponse()).toEqual(
        expect.objectContaining({
          code: CANCELLATION_STEP_ERROR_CODES.STEP_OUT_OF_ORDER,
          details: 'LOWER_TITLES',
        }),
      );
    }
  });

  const contextReadyForEleven = {
    ...baseContext,
    steps: baseSteps.map((step) =>
      step.stepCode === 'LOWER_TITLES' || step.stepCode === 'APPLY_FINE'
        ? { ...step, status: 'COMPLETED' }
        : step,
    ),
  };

  it.each([
    ['stub', 'stub'],
    ['live', 'live'],
    ['disabled', 'disabled'],
  ] as const)(
    'bloqueia OPEN_ELEVEN_REQUEST generico em modo %s',
    (_label, elevenMode) => {
      expect(stepRequiresIntegrationCompletion('OPEN_ELEVEN_REQUEST')).toBe(
        true,
      );

      expect(() =>
        assertCancellationStepCompletionAllowed({
          context: contextReadyForEleven,
          stepCode: 'OPEN_ELEVEN_REQUEST',
          roles: ['CANCELLATION_AGENT'],
          completionSource: 'generic',
          elevenMode,
        }),
      ).toThrow(CancellationStepPolicyException);
    },
  );

  it('nao exige integracao para outras etapas', () => {
    expect(stepRequiresIntegrationCompletion('ROUTE_PROTOCOL')).toBe(false);
  });

  it('permite financeiro concluir etapas financeiras', () => {
    expect(canRoleCompleteCancellationStep(['FINANCE'], 'LOWER_TITLES')).toBe(
      true,
    );
    expect(
      canRoleCompleteCancellationStep(['CANCELLATION_AGENT'], 'LOWER_TITLES'),
    ).toBe(false);
  });

  it('permite cancelamento concluir etapas operacionais', () => {
    expect(
      canRoleCompleteCancellationStep(['CANCELLATION_AGENT'], 'ROUTE_PROTOCOL'),
    ).toBe(true);
    expect(canRoleCompleteCancellationStep(['FINANCE'], 'ROUTE_PROTOCOL')).toBe(
      false,
    );
  });

  it('supervisor pode concluir qualquer etapa permitida pela ordem', () => {
    expect(
      canRoleCompleteCancellationStep(['SUPERVISOR'], 'LOWER_TITLES'),
    ).toBe(true);
    expect(
      canRoleCompleteCancellationStep(['SUPERVISOR'], 'ROUTE_PROTOCOL'),
    ).toBe(true);
  });

  it('bloqueia processo ja concluido', () => {
    expect(() =>
      assertCancellationStepCompletionAllowed({
        context: {
          ...baseContext,
          processStatus: 'COMPLETED',
        },
        stepCode: 'LOWER_TITLES',
        roles: ['ADMIN'],
        completionSource: 'generic',
        elevenMode: 'stub',
      }),
    ).toThrow(CancellationStepPolicyException);
  });

  it('retorna etapa anterior incompleta', () => {
    expect(
      getPreviousIncompleteStep(baseSteps, 'OPEN_ELEVEN_REQUEST')?.stepCode,
    ).toBe('LOWER_TITLES');
  });

  it('admin pode concluir qualquer etapa permitida pela ordem', () => {
    expect(canRoleCompleteCancellationStep(['ADMIN'], 'LOWER_TITLES')).toBe(
      true,
    );
    expect(
      canRoleCompleteCancellationStep(['ADMIN'], 'OPEN_ELEVEN_REQUEST'),
    ).toBe(true);
    expect(canRoleCompleteCancellationStep(['ADMIN'], 'ROUTE_PROTOCOL')).toBe(
      true,
    );
  });

  it('retorna step_permission_denied para role inadequada', () => {
    expect(() =>
      assertCancellationStepCompletionAllowed({
        context: baseContext,
        stepCode: 'LOWER_TITLES',
        roles: ['CANCELLATION_AGENT'],
        completionSource: 'generic',
        elevenMode: 'stub',
      }),
    ).toThrow(CancellationStepPolicyException);

    try {
      assertCancellationStepCompletionAllowed({
        context: baseContext,
        stepCode: 'LOWER_TITLES',
        roles: ['CANCELLATION_AGENT'],
        completionSource: 'generic',
        elevenMode: 'stub',
      });
    } catch (error) {
      expect((error as CancellationStepPolicyException).getResponse()).toEqual(
        expect.objectContaining({
          code: CANCELLATION_STEP_ERROR_CODES.STEP_PERMISSION_DENIED,
        }),
      );
    }
  });
});
