import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryRankingPreview } from '@/features/dashboard/components/recovery-ranking-preview';
import { renderWithProviders } from '@/test/test-utils';

const useRecoveryRanking = vi.fn();

vi.mock('@/features/ranking/hooks/use-recovery-ranking', () => ({
  useRecoveryRanking: (period: string): unknown => useRecoveryRanking(period),
}));

describe('RecoveryRankingPreview', () => {
  beforeEach(() => {
    useRecoveryRanking.mockReset();
  });

  it('mostra estado de carregamento', () => {
    useRecoveryRanking.mockReturnValue({ isLoading: true, isError: false });
    renderWithProviders(<RecoveryRankingPreview />);

    expect(screen.getByText('Carregando ranking...')).toBeInTheDocument();
  });

  it('mostra mensagem de erro', () => {
    useRecoveryRanking.mockReturnValue({ isLoading: false, isError: true });
    renderWithProviders(<RecoveryRankingPreview />);

    expect(
      screen.getByText('Não foi possível carregar o ranking agora.'),
    ).toBeInTheDocument();
  });

  it('mostra mensagem vazia quando nao ha recuperacoes', () => {
    useRecoveryRanking.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { ranking: [] },
    });
    renderWithProviders(<RecoveryRankingPreview />);

    expect(
      screen.getByText('Nenhuma recuperação registrada neste mês ainda.'),
    ).toBeInTheDocument();
  });

  it('lista no maximo os tres primeiros e linka para o ranking completo', () => {
    const ranking = [1, 2, 3, 4].map((rank) => ({
      rank,
      userId: `u${rank}`,
      name: `Agente ${rank}`,
      recoveredAmount: '500.00',
      recoveredCases: rank,
    }));
    useRecoveryRanking.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { ranking },
    });
    renderWithProviders(<RecoveryRankingPreview />);

    expect(useRecoveryRanking).toHaveBeenCalledWith('current_month');
    expect(screen.getByText('Agente 1')).toBeInTheDocument();
    expect(screen.getByText('Agente 3')).toBeInTheDocument();
    expect(screen.queryByText('Agente 4')).toBeNull();
    expect(
      screen.getByRole('link', { name: /Ver ranking completo/ }),
    ).toHaveAttribute('href', '/ranking');
  });
});
