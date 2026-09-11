import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Polyfill exigido pelo sonner (Toaster) em ambiente jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      // Por padrao os testes rodam como desktop (>= lg), para exercitar o
      // layout de tabela. Testes de layout mobile sobrescrevem matchMedia.
      matches: query.includes('min-width: 1024px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}
import { authStorageKey } from '@/features/auth/auth.constants';
import { type AuthSession } from '@/types/auth';
import { ApiError } from '@/services/api/api-error';
import {
  TEST_API_TOKEN,
  TEST_ROTATED_REFRESH_TOKEN,
} from '@/test/test-credentials';

vi.mock('@/services/api/http-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/api/http-client')>();

  return {
    ...actual,
    httpClient: {
      request: vi.fn(
        async (config: Parameters<typeof actual.httpClient.request>[0]) => {
          if (config.path === '/auth/me') {
            const rawValue = window.localStorage.getItem(authStorageKey);

            if (!rawValue) {
              throw new ApiError(401, {
                message: 'Sessão ausente para bootstrap de teste.',
              });
            }

            const session = JSON.parse(rawValue) as AuthSession;
            const authorization = (
              config.headers as Record<string, string> | undefined
            )?.Authorization;
            const token = authorization?.replace('Bearer ', '');

            if (session.accessToken !== token) {
              throw new ApiError(401, {
                message: 'Token de bootstrap divergente da sessão armazenada.',
              });
            }

            return {
              data: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                roles: session.user.roles,
              },
              status: 200,
              timestamp: new Date().toISOString(),
            };
          }

          if (config.path === '/auth/logout') {
            return {
              data: { success: true },
              status: 201,
              timestamp: new Date().toISOString(),
            };
          }

          if (config.path === '/auth/refresh') {
            return {
              data: {
                accessToken: TEST_API_TOKEN,
                refreshToken: TEST_ROTATED_REFRESH_TOKEN,
              },
              status: 201,
              timestamp: new Date().toISOString(),
            };
          }

          return actual.httpClient.request(config);
        },
      ),
    },
  };
});
