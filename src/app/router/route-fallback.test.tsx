import { lazy, type ReactElement, Suspense } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteFallback } from '@/app/router/route-fallback';
import { renderWithProviders } from '@/test/test-utils';
import { createMockSession } from '@/test/auth-test-utils';

const DeferredRoute = lazy(
  async () =>
    new Promise<{ default: () => ReactElement }>(() => {
      return;
    }),
);

describe('RouteFallback', () => {
  it('renderiza fallback para rota lazy', () => {
    renderWithProviders(
      <Suspense fallback={<RouteFallback />}>
        <DeferredRoute />
      </Suspense>,
      {
        session: createMockSession(),
      },
    );

    expect(screen.getByText('Carregando módulo')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Preparando os dados e a interface da rota selecionada.',
      ),
    ).toBeInTheDocument();
  });
});
