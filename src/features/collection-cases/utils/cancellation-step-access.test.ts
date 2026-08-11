import { describe, expect, it } from 'vitest';
import {
  getCancellationStepRowClassName,
  getNextPendingCancellationStep,
  resolveCancellationStepActionState,
} from '@/features/collection-cases/utils/cancellation-step-access';
import type { CollectionCaseCancellationStepSummary } from '@/features/collection-cases/types/collection-cases-api.types';

const steps: CollectionCaseCancellationStepSummary[] = [
  {
    id: 'step_1',
    stepCode: 'LOWER_TITLES',
    name: 'Baixar títulos',
    stepOrder: 1,
    status: 'PENDING',
    externalProtocol: null,
    completedAt: null,
    completedByName: null,
  },
  {
    id: 'step_2',
    stepCode: 'APPLY_FINE',
    name: 'Aplicar multa',
    stepOrder: 2,
    status: 'PENDING',
    externalProtocol: null,
    completedAt: null,
    completedByName: null,
  },
  {
    id: 'step_3',
    stepCode: 'OPEN_ELEVEN_REQUEST',
    name: 'Abrir solicitação Eleven',
    stepOrder: 3,
    status: 'PENDING',
    externalProtocol: null,
    completedAt: null,
    completedByName: null,
  },
];

describe('cancellation-step-access', () => {
  it('identifica proxima etapa pendente', () => {
    expect(getNextPendingCancellationStep(steps)?.stepCode).toBe(
      'LOWER_TITLES',
    );
  });

  it('libera acao apenas para proxima etapa permitida', () => {
    const lowerTitles = resolveCancellationStepActionState({
      step: steps[0],
      steps,
      processStatus: 'IN_PROGRESS',
      userRoles: ['FINANCE'],
    });

    expect(lowerTitles.kind).toBe('available');
    expect(lowerTitles.isNextPending).toBe(true);
  });

  it('desabilita etapa futura com motivo', () => {
    const applyFine = resolveCancellationStepActionState({
      step: steps[1],
      steps,
      processStatus: 'IN_PROGRESS',
      userRoles: ['FINANCE'],
    });

    expect(applyFine.kind).toBe('disabled');
    expect(applyFine.blockReason).toContain('Baixar títulos');
  });

  it('oculta acao para usuario sem role da etapa', () => {
    const lowerTitles = resolveCancellationStepActionState({
      step: steps[0],
      steps,
      processStatus: 'IN_PROGRESS',
      userRoles: ['CANCELLATION_AGENT'],
    });

    expect(lowerTitles.kind).toBe('hidden');
  });

  it('marca OPEN_ELEVEN_REQUEST para acao Eleven', () => {
    const completedSteps: CollectionCaseCancellationStepSummary[] = steps.map(
      (step) =>
        step.stepCode === 'LOWER_TITLES' || step.stepCode === 'APPLY_FINE'
          ? { ...step, status: 'COMPLETED' as const }
          : step,
    );

    const elevenStep = resolveCancellationStepActionState({
      step: completedSteps[2],
      steps: completedSteps,
      processStatus: 'IN_PROGRESS',
      userRoles: ['CANCELLATION_AGENT'],
    });

    expect(elevenStep.kind).toBe('available');
    expect(elevenStep.useElevenAction).toBe(true);
  });

  it('destaca visualmente proxima etapa disponivel', () => {
    const lowerTitles = resolveCancellationStepActionState({
      step: steps[0],
      steps,
      processStatus: 'IN_PROGRESS',
      userRoles: ['FINANCE'],
    });

    expect(getCancellationStepRowClassName(lowerTitles)).toBe(
      'bg-muted/60 ring-1 ring-inset ring-border',
    );
  });

  it('nao destaca etapa futura bloqueada', () => {
    const applyFine = resolveCancellationStepActionState({
      step: steps[1],
      steps,
      processStatus: 'IN_PROGRESS',
      userRoles: ['FINANCE'],
    });

    expect(getCancellationStepRowClassName(applyFine)).toBeUndefined();
  });
});
