import { type ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import { Toaster } from 'sonner';
import { authStorageKey } from '@/features/auth/auth.constants';
import { AuthProvider } from '@/features/auth/auth-provider';
import { type AuthSession } from '@/types/auth';

type ProvidersProps = PropsWithChildren<{
  route?: string;
  session?: AuthSession | null;
}>;

function Providers({ children, route = '/', session }: ProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  if (typeof window !== 'undefined') {
    if (session) {
      window.localStorage.setItem(authStorageKey, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(authStorageKey);
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { route?: string; session?: AuthSession | null },
) {
  const { route, session, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => (
      <Providers route={route} session={session}>
        {children}
      </Providers>
    ),
    ...renderOptions,
  });
}
