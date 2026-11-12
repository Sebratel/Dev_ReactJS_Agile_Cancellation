import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HsmDeliveryBadge } from '@/features/collection-cases/components/hsm-delivery-badge';

describe('HsmDeliveryBadge', () => {
  it('nao renderiza nada sem estado de entrega', () => {
    const { container } = render(<HsmDeliveryBadge state={null} inline />);

    expect(container).toBeEmptyDOMElement();
  });

  it('inline mostra o rotulo como texto, sem selo, para nao aumentar a linha', () => {
    const { container } = render(
      <p>
        Contrato Ativo
        <HsmDeliveryBadge state="DELIVERED" inline />
      </p>,
    );

    expect(screen.getByText('HSM entregue')).toBeInTheDocument();
    // Sem o selo (pill) do StatusBadge.
    expect(container.querySelector('.rounded-full.px-2')).toBeNull();
  });

  it('por padrao mostra o selo completo', () => {
    render(<HsmDeliveryBadge state="READ" />);

    expect(screen.getByText('HSM lido')).toBeInTheDocument();
  });
});
