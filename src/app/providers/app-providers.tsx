import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useMemo } from 'react';
import { ErrorBoundary } from '@/app/providers/error-boundary';
import { QueryProvider } from '@/app/providers/query-provider';
import { createAppRouter } from '@/app/router/router';
import { AuthProvider } from '@/features/auth/auth-provider';

export function AppProviders() {
  const router = useMemo(() => createAppRouter(), []);

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" gap={8} duration={4000} />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
