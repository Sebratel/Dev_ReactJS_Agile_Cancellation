import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/app/providers/error-boundary';
import { QueryProvider } from '@/app/providers/query-provider';
import { appRouter } from '@/app/router/router';
import { AuthProvider } from '@/features/auth/auth-provider';

export function AppProviders() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <RouterProvider router={appRouter} />
          <Toaster position="bottom-right" gap={8} duration={4000} />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
