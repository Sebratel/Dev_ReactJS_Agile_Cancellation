import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecoveryRankingPodium } from '@/features/ranking/components/recovery-ranking-podium';
import { type RankingRow } from '@/features/ranking/utils/ranking-stats';

function row(rank: number, name: string): RankingRow {
  return {
    rank,
    userId: `u${rank}`,
    name,
    recoveredAmount: '1000.00',
    recoveredCases: rank + 1,
    averageTicket: 100,
    sharePercent: 50,
  };
}

describe('RecoveryRankingPodium', () => {
  it('nao renderiza nada sem itens', () => {
    const { container } = render(<RecoveryRankingPodium items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('mostra apenas os tres primeiros colocados com rotulos de posicao', () => {
    render(
      <RecoveryRankingPodium
        items={[
          row(1, 'Ana Lima'),
          row(2, 'Bruno Dias'),
          row(3, 'Carla Melo'),
          row(4, 'Diego Reis'),
        ]}
      />,
    );

    expect(screen.getByText('1º lugar')).toBeInTheDocument();
    expect(screen.getByText('2º lugar')).toBeInTheDocument();
    expect(screen.getByText('3º lugar')).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.queryByText('Diego Reis')).toBeNull();
    expect(screen.queryByText('Vaga livre')).toBeNull();
  });

  it('mostra vaga livre nas posicoes sem colaborador', () => {
    render(<RecoveryRankingPodium items={[row(1, 'Eva Costa')]} />);

    expect(screen.getByText('Eva Costa')).toBeInTheDocument();
    expect(screen.getAllByText('Vaga livre')).toHaveLength(2);
  });
});
