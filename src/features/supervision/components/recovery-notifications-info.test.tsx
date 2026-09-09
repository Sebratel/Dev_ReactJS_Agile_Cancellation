import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RecoveryNotificationsInfo } from '@/features/supervision/components/recovery-notifications-info';

describe('RecoveryNotificationsInfo', () => {
  it('começa recolhida (só o título visível)', () => {
    render(<RecoveryNotificationsInfo />);

    const toggle = screen.getByRole('button', {
      name: /Sobre as notificações de regularização/,
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/quita o débito/)).not.toBeInTheDocument();
  });

  it('expande ao clicar e explica quando e para quem', async () => {
    const user = userEvent.setup();
    render(<RecoveryNotificationsInfo />);

    await user.click(
      screen.getByRole('button', {
        name: /Sobre as notificações de regularização/,
      }),
    );

    expect(screen.getByText(/quita o débito/)).toBeInTheDocument();
    expect(screen.getByText(/A supervisão/)).toBeInTheDocument();
    expect(screen.getByText(/O atendente responsável/)).toBeInTheDocument();
  });
});
