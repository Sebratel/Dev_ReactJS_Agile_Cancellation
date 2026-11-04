import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '@/app/providers/error-boundary';

function Bomb({ explode }: { explode: boolean }) {
  if (explode) {
    throw new Error('falha de render');
  }
  return <p>conteudo seguro</p>;
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza os filhos quando nao ha erro', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('conteudo seguro')).toBeInTheDocument();
  });

  it('mostra o fallback e registra o erro quando um filho quebra', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Ocorreu um erro inesperado')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Recarregar' }),
    ).toBeInTheDocument();
    const call = consoleError.mock.calls.find(
      (args) => args[0] === '[ErrorBoundary]',
    );
    expect(call?.[1]).toBeInstanceOf(Error);
    expect(typeof call?.[2]).toBe('string');
  });
});
