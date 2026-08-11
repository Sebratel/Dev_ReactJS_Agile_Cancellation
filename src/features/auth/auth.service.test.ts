import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchCurrentUser,
  loginWithGoogle,
  logoutWithApi,
  refreshWithApi,
} from '@/features/auth/auth.service';
import { authStorageKey } from '@/features/auth/auth.constants';
import { ApiError } from '@/services/api/api-error';
import {
  TEST_API_TOKEN,
  TEST_INVALID_GOOGLE_ID_TOKEN,
  TEST_LOGOUT_TOKEN,
  TEST_MOCK_GOOGLE_ID_TOKEN,
  TEST_REFRESH_TOKEN,
  TEST_ROTATED_REFRESH_TOKEN,
} from '@/test/test-credentials';
import type { ApiSuccessResponse } from '@/services/api/api-types';
import type { LoginApiResponse } from '@/features/auth/types/auth-api.types';

const requestMock = vi.fn();

vi.mock('@/services/api/http-client', () => ({
  httpClient: {
    request: (config: unknown) => requestMock(config) as Promise<unknown>,
  },
}));

describe('auth.service', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('loginWithGoogle chama endpoint correto', async () => {
    requestMock.mockResolvedValue({
      data: {
        accessToken: TEST_API_TOKEN,
        refreshToken: TEST_REFRESH_TOKEN,
        user: {
          id: 'user-admin',
          email: 'admin@ger.local',
          name: 'Ana Martins',
          roles: ['ADMIN'],
        },
      },
      status: 201,
      timestamp: '2026-06-10T12:00:00.000Z',
    } satisfies ApiSuccessResponse<LoginApiResponse>);

    const session = await loginWithGoogle(TEST_MOCK_GOOGLE_ID_TOKEN);

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/auth/google',
        method: 'POST',
        skipAuth: true,
        skipRefresh: true,
        body: JSON.stringify({ idToken: TEST_MOCK_GOOGLE_ID_TOKEN }),
      }),
    );
    expect(session.accessToken).toBe(TEST_API_TOKEN);
    expect(session.refreshToken).toBe(TEST_REFRESH_TOKEN);
    expect(session.user.email).toBe('admin@ger.local');
  });

  it('loginWithGoogle salva accessToken e refreshToken', async () => {
    requestMock.mockResolvedValue({
      data: {
        accessToken: TEST_LOGOUT_TOKEN,
        refreshToken: TEST_ROTATED_REFRESH_TOKEN,
        user: {
          id: 'user-supervisor',
          email: 'supervisor@ger.local',
          name: 'Paulo Nogueira',
          roles: ['SUPERVISOR'],
        },
      },
      status: 201,
      timestamp: '2026-06-10T12:00:00.000Z',
    });

    const session = await loginWithGoogle(TEST_MOCK_GOOGLE_ID_TOKEN);

    window.localStorage.setItem(authStorageKey, JSON.stringify(session));

    const stored = window.localStorage.getItem(authStorageKey);
    expect(stored).toContain(TEST_LOGOUT_TOKEN);
    expect(stored).toContain(TEST_ROTATED_REFRESH_TOKEN);
  });

  it('refreshWithApi chama endpoint correto', async () => {
    requestMock.mockResolvedValue({
      data: {
        accessToken: TEST_API_TOKEN,
        refreshToken: TEST_ROTATED_REFRESH_TOKEN,
      },
      status: 201,
      timestamp: '2026-06-10T12:00:00.000Z',
    });

    const tokens = await refreshWithApi(TEST_REFRESH_TOKEN);

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/auth/refresh',
        method: 'POST',
        skipAuth: true,
        skipRefresh: true,
      }),
    );
    expect(tokens.refreshToken).toBe(TEST_ROTATED_REFRESH_TOKEN);
  });

  it('fetchCurrentUser usa /auth/me', async () => {
    window.localStorage.setItem(
      authStorageKey,
      JSON.stringify({
        accessToken: TEST_API_TOKEN,
        refreshToken: TEST_REFRESH_TOKEN,
        user: {
          id: 'user-admin',
          email: 'admin@ger.local',
          name: 'Ana Martins',
          roles: ['ADMIN'],
          role: 'ADMIN',
        },
      }),
    );

    requestMock.mockResolvedValue({
      data: {
        id: 'user-admin',
        email: 'admin@ger.local',
        name: 'Ana Martins',
        roles: ['ADMIN'],
      },
      status: 200,
      timestamp: '2026-06-10T12:00:00.000Z',
    });

    const session = await fetchCurrentUser(TEST_API_TOKEN);

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/auth/me',
        headers: {
          Authorization: `Bearer ${TEST_API_TOKEN}`,
        },
      }),
    );
    expect(session.refreshToken).toBe(TEST_REFRESH_TOKEN);
  });

  it('logoutWithApi chama endpoint de logout', async () => {
    requestMock.mockResolvedValue({
      data: { success: true },
      status: 201,
      timestamp: '2026-06-10T12:00:00.000Z',
    });

    await logoutWithApi({
      accessToken: TEST_API_TOKEN,
      refreshToken: TEST_REFRESH_TOKEN,
    });

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/auth/logout',
        method: 'POST',
        skipRefresh: true,
      }),
    );
  });

  it('loginWithGoogle propaga erro da API', async () => {
    requestMock.mockRejectedValue(
      new ApiError(401, { message: 'Credenciais invalidas.' }),
    );

    await expect(
      loginWithGoogle(TEST_INVALID_GOOGLE_ID_TOKEN),
    ).rejects.toThrow('Credenciais invalidas.');
  });
});
