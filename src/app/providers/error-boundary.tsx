import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-danger bg-card p-8 text-center">
            <p className="text-lg font-semibold text-danger">
              Ocorreu um erro inesperado
            </p>
            <p className="mt-2 text-sm text-neutral">
              Recarregue a página. Se o problema persistir, entre em contato com
              o suporte.
            </p>
            <button
              className="mt-6 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-foreground"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
