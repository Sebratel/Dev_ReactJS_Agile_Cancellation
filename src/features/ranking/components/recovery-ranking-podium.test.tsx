import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecoveryRankingPodium } from '@/features/ranking/components/recovery-ranking-podium';
import { type RecoveryRankingItem } from '@/features/ranking/types/ranking-api.types';

function item(rank: number, name: string): RecoveryRankingItem {
  return {
    rank,
    userId: `u${rank}`,
    name,
    recoveredAmount: '1000.00',
    recoveredCases: rank + 1,
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
          item(1, 'Ana Lima'),
          item(2, 'Bruno Dias'),
          item(3, 'Carla Melo'),
          item(4, 'Diego Reis'),
        ]}
      />,
    );

    expect(screen.getByText('1o lugar')).toBeInTheDocument();
    expect(screen.getByText('2o lugar')).toBeInTheDocument();
    expect(screen.getByText('3o lugar')).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.queryByText('Diego Reis')).toBeNull();
    expect(screen.getByText('2 casos recuperados')).toBeInTheDocument();
  });

  it('usa o estilo do terceiro lugar para posicoes fora do mapa', () => {
    render(<RecoveryRankingPodium items={[item(7, 'Eva Costa')]} />);

    expect(screen.getByText('3o lugar')).toBeInTheDocument();
  });
});
