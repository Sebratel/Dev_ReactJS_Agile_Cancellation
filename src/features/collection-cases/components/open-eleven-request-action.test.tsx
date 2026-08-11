import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OpenElevenRequestAction } from '@/features/collection-cases/components/open-eleven-request-action';

const mutateAsync = vi.fn();

const useElevenIntegrationStatusMock = vi.fn();

vi.mock(
  '@/features/collection-cases/hooks/use-create-eleven-cancellation-request',
  () => ({
    useCreateElevenCancellationRequest: () => ({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    }),
  }),
);

vi.mock('@/features/integrations/hooks/use-eleven-integration-status', () => ({
  useElevenIntegrationStatus: (): ReturnType<
    typeof import('@/features/integrations/hooks/use-eleven-integration-status').useElevenIntegrationStatus
  > =>
    useElevenIntegrationStatusMock() as ReturnType<
      typeof import('@/features/integrations/hooks/use-eleven-integration-status').useElevenIntegrationStatus
    >,
}));

const step = {
  id: 'step_eleven',
  stepCode: 'OPEN_ELEVEN_REQUEST',
  name: 'Abrir solicitação Eleven',
  stepOrder: 3,
  status: 'PENDING',
  externalProtocol: null,
  completedAt: null,
  completedByName: null,
};

describe('OpenElevenRequestAction', () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    useElevenIntegrationStatusMock.mockReturnValue({
      data: {
        mode: 'stub',
        available: true,
        message: 'Integração Eleven em modo simulado.',
      },
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('confirma mutation Eleven com payload correto', async () => {
    mutateAsync.mockResolvedValue({
      protocol: 'ELEVEN-STUB-20260608-A1B2',
      step: { ...step, status: 'COMPLETED' },
    });

    const user = userEvent.setup();

    render(
      <OpenElevenRequestAction
        caseId="case_0001"
        cancellationId="can_0001"
        step={step}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Abrir solicitação Eleven' }),
    );
    await user.type(
      screen.getByLabelText('Observação (opcional)'),
      'Abertura teste.',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar abertura' }),
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      cancellationId: 'can_0001',
      payload: {
        notes: 'Abertura teste.',
      },
    });
  });

  it('exibe protocolo retornado apos sucesso', async () => {
    mutateAsync.mockResolvedValue({
      protocol: 'ELEVEN-STUB-20260608-A1B2',
      step: { ...step, status: 'COMPLETED' },
    });

    const user = userEvent.setup();

    render(
      <OpenElevenRequestAction
        caseId="case_0001"
        cancellationId="can_0001"
        step={step}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Abrir solicitação Eleven' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar abertura' }),
    );

    expect(
      await screen.findByText('Protocolo: ELEVEN-STUB-20260608-A1B2'),
    ).toBeInTheDocument();
  });

  it('mostra feedback de erro', async () => {
    mutateAsync.mockRejectedValue(new Error('Falha Eleven'));

    const user = userEvent.setup();

    render(
      <OpenElevenRequestAction
        caseId="case_0001"
        cancellationId="can_0001"
        step={step}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Abrir solicitação Eleven' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar abertura' }),
    );

    expect(
      screen.getByText('Não foi possível abrir a solicitação Eleven.'),
    ).toBeInTheDocument();
  });

  it('desabilita botao Eleven quando integracao indisponivel', () => {
    useElevenIntegrationStatusMock.mockReturnValue({
      data: {
        mode: 'disabled',
        available: false,
        message: 'Integração Eleven desabilitada.',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <OpenElevenRequestAction
        caseId="case_0001"
        cancellationId="can_0001"
        step={step}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Abrir solicitação Eleven' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Integração Eleven desabilitada.'),
    ).toBeInTheDocument();
  });

  it('nao chama mutation quando integracao indisponivel', () => {
    useElevenIntegrationStatusMock.mockReturnValue({
      data: {
        mode: 'disabled',
        available: false,
        message: 'Integração Eleven desabilitada.',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <OpenElevenRequestAction
        caseId="case_0001"
        cancellationId="can_0001"
        step={step}
      />,
    );

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('habilita botao Eleven quando integracao disponivel', () => {
    render(
      <OpenElevenRequestAction
        caseId="case_0001"
        cancellationId="can_0001"
        step={step}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Abrir solicitação Eleven' }),
    ).toBeEnabled();
  });
});
