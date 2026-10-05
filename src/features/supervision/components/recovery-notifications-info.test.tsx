import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RecoveryNotificationsInfo } from '@/features/supervision/components/recovery-notifications-info';

describe('RecoveryNotificationsInfo', () => {
  it('mostra só o botão (popup fechado por padrão)', () => {
    render(<RecoveryNotificationsInfo />);

    expect(
      screen.getByRole('button', { name: /Sobre as notificações/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/quita o débito/)).not.toBeInTheDocument();
  });

  it('abre o popup ao clicar e explica quando e para quem', async () => {
    const user = userEvent.setup();
    render(<RecoveryNotificationsInfo />);

    await user.click(
      screen.getByRole('button', { name: /Sobre as notificações/ }),
    );

    expect(await screen.findByText(/quita o débito/)).toBeInTheDocument();
    expect(screen.getByText(/A supervisão/)).toBeInTheDocument();
    expect(screen.getByText(/O atendente responsável/)).toBeInTheDocument();
  });

  it('fecha o popup ao clicar em Entendi', async () => {
    const user = userEvent.setup();
    render(<RecoveryNotificationsInfo />);

    await user.click(
      screen.getByRole('button', { name: /Sobre as notificações/ }),
    );
    expect(await screen.findByText(/quita o débito/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(screen.queryByText(/quita o débito/)).not.toBeInTheDocument();
  });
});
