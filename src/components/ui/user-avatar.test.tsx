import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from '@/components/ui/user-avatar';

describe('UserAvatar', () => {
  it('mostra as iniciais quando nao ha foto', () => {
    render(<UserAvatar name="Debora Silva" />);

    expect(screen.getByText('DS')).toBeInTheDocument();
  });

  it('mostra a foto quando existe', () => {
    const { container } = render(
      <UserAvatar name="Debora Silva" avatarUrl="https://x.test/a.jpg" />,
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://x.test/a.jpg',
    );
  });

  it('volta para as iniciais se a imagem falhar ao carregar', () => {
    const { container } = render(
      <UserAvatar name="Debora Silva" avatarUrl="https://x.test/a.jpg" />,
    );

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('DS')).toBeInTheDocument();
  });
});
