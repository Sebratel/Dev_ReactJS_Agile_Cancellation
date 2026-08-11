import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CancellationProcessSection } from '@/features/collection-cases/components/cancellation-process-section';
import type { CollectionCaseCancellationSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import { TEST_ACCESS_TOKEN, TEST_REFRESH_TOKEN } from '@/test/test-credentials';
import type { UserRole } from '@/types/auth';

const mutateAsync = vi.fn();
const useCompleteCancellationStepMock = vi.fn();
const useCreateElevenCancellationRequestMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: (): ReturnType<
    typeof import('@/features/auth/auth-context').useAuth
  > =>
    useAuthMock() as ReturnType<
      typeof import('@/features/auth/auth-context').useAuth
    >,
}));

vi.mock(
  '@/features/collection-cases/hooks/use-complete-cancellation-step',
  () => ({
    useCompleteCancellationStep: (...args: unknown[]) =>
      useCompleteCancellationStepMock(...args) as unknown as ReturnType<
        typeof import('@/features/collection-cases/hooks/use-complete-cancellation-step').useCompleteCancellationStep
      >,
  }),
);

vi.mock(
  '@/features/collection-cases/hooks/use-create-eleven-cancellation-request',
  () => ({
    useCreateElevenCancellationRequest: (...args: unknown[]) =>
      useCreateElevenCancellationRequestMock(...args) as unknown as ReturnType<
        typeof import('@/features/collection-cases/hooks/use-create-eleven-cancellation-request').useCreateElevenCancellationRequest
      >,
  }),
);

vi.mock('@/features/integrations/hooks/use-eleven-integration-status', () => ({
  useElevenIntegrationStatus: () => ({
    data: {
      mode: 'stub',
      available: true,
      message: 'Integração Eleven em modo simulado.',
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

function mockAuthRoles(roles: UserRole[]) {
  useAuthMock.mockReturnValue({
    session: {
      user: {
        id: 'user_test',
        name: 'Usuario Teste',
        email: 'test@ger.local',
        roles,
        role: roles[0] ?? 'VIEWER',
      },
      accessToken: TEST_ACCESS_TOKEN,
      refreshToken: TEST_REFRESH_TOKEN,
    },
    status: 'authenticated',
    errorMessage: null,
    login: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  });
}

const cancellationProcess: CollectionCaseCancellationSummary = {
  id: 'can_0001',
  status: 'IN_PROGRESS',
  startedAt: '2026-06-01T10:00:00.000Z',
  completedAt: null,
  steps: [
    {
      id: 'step_1',
      stepCode: 'LOWER_TITLES',
      name: 'Baixar titulos',
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
  ],
};

describe('CancellationProcessSection', () => {
  beforeEach(() => {
    mockAuthRoles(['FINANCE']);
    useCreateElevenCancellationRequestMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    });
    useCompleteCancellationStepMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it('renderiza etapas do processo', () => {
    render(
      <CancellationProcessSection
        caseId="case_0001"
        cancellationProcess={cancellationProcess}
      />,
    );

    expect(screen.getByText('Processo de cancelamento')).toBeInTheDocument();
    expect(screen.getAllByText('Baixar titulos').length).toBeGreaterThan(0);
    expect(screen.getByText('Aplicar multa')).toBeInTheDocument();
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);
  });

  it('destaca proxima etapa pendente', () => {
    render(
      <CancellationProcessSection
        caseId="case_0001"
        cancellationProcess={cancellationProcess}
      />,
    );

    expect(screen.getByText('Próxima etapa pendente:')).toBeInTheDocument();
    expect(screen.getByText('Próxima')).toBeInTheDocument();

    const actionButtons = screen.getAllByRole('button', {
      name: 'Concluir etapa',
    });

    expect(actionButtons[0]).toBeEnabled();
    expect(actionButtons[1]).toBeDisabled();
  });

  it('desabilita etapa futura com motivo', () => {
    render(
      <CancellationProcessSection
        caseId="case_0001"
        cancellationProcess={cancellationProcess}
      />,
    );

    expect(
      screen.getByText('Conclua antes a etapa "Baixar titulos".'),
    ).toBeInTheDocument();

    const actionButtons = screen.getAllByRole('button', {
      name: 'Concluir etapa',
    });

    expect(actionButtons).toHaveLength(2);
    expect(actionButtons[1]).toBeDisabled();
  });

  it('desabilita acoes quando processo ja foi concluido', () => {
    render(
      <CancellationProcessSection
        caseId="case_0001"
        cancellationProcess={{
          ...cancellationProcess,
          status: 'COMPLETED',
          completedAt: '2026-06-10T10:00:00.000Z',
        }}
      />,
    );

    expect(
      screen.getAllByText('Processo de cancelamento já foi concluído.'),
    ).toHaveLength(2);

    const actionButtons = screen.getAllByRole('button', {
      name: 'Concluir etapa',
    });

    expect(actionButtons).toHaveLength(2);
    expect(
      actionButtons.every((button) => button.hasAttribute('disabled')),
    ).toBe(true);
  });

  it('nao mostra acao para usuario sem role da etapa', () => {
    mockAuthRoles(['CANCELLATION_AGENT']);

    render(
      <CancellationProcessSection
        caseId="case_0001"
        cancellationProcess={{
          ...cancellationProcess,
          steps: cancellationProcess.steps.filter(
            (step) => step.stepCode === 'LOWER_TITLES',
          ),
        }}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Concluir etapa' }),
    ).not.toBeInTheDocument();
  });

  it('nao mostra acao para etapa concluida', () => {
    render(
      <CancellationProcessSection
        caseId="case_0001"
        cancellationProcess={{
          ...cancellationProcess,
          steps: [
            {
              id: 'step_2',
              stepCode: 'APPLY_FINE',
              name: 'Aplicar multa',
              stepOrder: 2,
              status: 'COMPLETED',
              externalProtocol: 'PROT-001',
              completedAt: '2026-06-02T10:00:00.000Z',
              completedByName: 'Carla Mendes',
            },
          ],
        }}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Concluir etapa' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Concluída')).toBeInTheDocument();
  });
});

describe('CompleteCancellationStepAction', () => {
  beforeEach(() => {
    mockAuthRoles(['FINANCE']);
    useCreateElevenCancellationRequestMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it('confirma mutation com payload correto', async () => {
    mutateAsync.mockResolvedValue({});
    useCompleteCancellationStepMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();

    render(
      <CancellationProcessSection
        caseId="case_0001"
        cancellationProcess={{
          ...cancellationProcess,
          steps: cancellationProcess.steps.filter(
            (step) => step.stepCode === 'LOWER_TITLES',
          ),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Concluir etapa' }));
    await user.type(screen.getByLabelText('Observação'), 'Titulos baixados.');
    await user.type(
      screen.getByLabelText('Protocolo externo (opcional)'),
      'PROT-002',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar conclusão' }),
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      cancellationId: 'can_0001',
      stepCode: 'LOWER_TITLES',
      payload: {
        notes: 'Titulos baixados.',
        externalProtocol: 'PROT-002',
        completedAt: undefined,
      },
    });
  });

  it('mostra acao Eleven para OPEN_ELEVEN_REQUEST pendente', () => {
    useCompleteCancellationStepMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });
    mockAuthRoles(['CANCELLATION_AGENT']);

    render(
      <CancellationProcessSection
        caseId="case_0001"
        cancellationProcess={{
          ...cancellationProcess,
          steps: [
            {
              id: 'step_1',
              stepCode: 'LOWER_TITLES',
              name: 'Baixar titulos',
              stepOrder: 1,
              status: 'COMPLETED',
              externalProtocol: null,
              completedAt: '2026-06-01T10:00:00.000Z',
              completedByName: 'Carla Mendes',
            },
            {
              id: 'step_2',
              stepCode: 'APPLY_FINE',
              name: 'Aplicar multa',
              stepOrder: 2,
              status: 'COMPLETED',
              externalProtocol: null,
              completedAt: '2026-06-02T10:00:00.000Z',
              completedByName: 'Carla Mendes',
            },
            {
              id: 'step_eleven',
              stepCode: 'OPEN_ELEVEN_REQUEST',
              name: 'Abrir solicitação Eleven',
              stepOrder: 3,
              status: 'PENDING',
              externalProtocol: null,
              completedAt: null,
              completedByName: null,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Abrir solicitação Eleven' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Concluir etapa' }),
    ).not.toBeInTheDocument();
  });

  it('mostra protocolo para OPEN_ELEVEN_REQUEST concluida', () => {
    render(
      <CancellationProcessSection
        caseId="case_0001"
        cancellationProcess={{
          ...cancellationProcess,
          steps: [
            {
              id: 'step_eleven',
              stepCode: 'OPEN_ELEVEN_REQUEST',
              name: 'Abrir solicitação Eleven',
              stepOrder: 3,
              status: 'COMPLETED',
              externalProtocol: 'ELEVEN-STUB-20260608-A1B2',
              completedAt: '2026-06-03T10:00:00.000Z',
              completedByName: 'Rafael Costa',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('ELEVEN-STUB-20260608-A1B2')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Abrir solicitação Eleven' }),
    ).not.toBeInTheDocument();
  });
});
