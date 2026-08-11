import { authStorageKey } from '@/features/auth/auth.constants';
import { ApiError } from '@/services/api/api-error';
import { type AuthSession } from '@/types/auth';
import {
  type LoginApiResponse,
  type MeApiResponse,
  type RefreshApiResponse,
} from '@/features/auth/types/auth-api.types';
import { mapAuthUserFromApi } from '@/features/auth/utils/map-auth-user';
import { resolvePrimaryRole } from '@/features/auth/utils/role-utils';
import { httpClient } from '@/services/api/http-client';

function toAuthSession(
  tokens: { accessToken: string; refreshToken: string },
  user: MeApiResponse,
): AuthSession {
  const mappedUser = mapAuthUserFromApi(user);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      ...mappedUser,
      role: resolvePrimaryRole(mappedUser.roles),
    },
  };
}

export async function loginWithGoogle(idToken: string): Promise<AuthSession> {
  if (import.meta.env.DEV && idToken.startsWith('mock:')) {
    const email = idToken.slice(5);
    const response = await httpClient.request<LoginApiResponse>({
      path: '/auth/dev-login',
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
      skipRefresh: true,
    });
    return toAuthSession(
      { accessToken: response.data.accessToken, refreshToken: response.data.refreshToken },
      response.data.user,
    );
  }

  const response = await httpClient.request<LoginApiResponse>({
    path: '/auth/google',
    method: 'POST',
    body: JSON.stringify({ idToken }),
    skipAuth: true,
    skipRefresh: true,
  });

  return toAuthSession(
    {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    },
    response.data.user,
  );
}

export async function refreshWithApi(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await httpClient.request<RefreshApiResponse>({
    path: '/auth/refresh',
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
    skipAuth: true,
    skipRefresh: true,
  });

  return {
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  };
}

export async function fetchCurrentUser(
  accessToken: string,
): Promise<AuthSession> {
  const response = await httpClient.request<MeApiResponse>({
    path: '/auth/me',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const storedRefreshToken = readRefreshTokenFromStorage();

  return toAuthSession(
    {
      accessToken,
      refreshToken: storedRefreshToken ?? '',
    },
    response.data,
  );
}

export async function restoreSessionFromRefresh(
  storedSession: AuthSession,
): Promise<AuthSession> {
  const tokens = await refreshWithApi(storedSession.refreshToken);
  const mergedSession: AuthSession = {
    ...storedSession,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };

  try {
    return await fetchCurrentUser(tokens.accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return mergedSession;
    }

    throw error;
  }
}

export async function logoutWithApi(session: {
  accessToken?: string;
  refreshToken?: string;
}) {
  await httpClient.request<{ success: true }>({
    path: '/auth/logout',
    method: 'POST',
    body: JSON.stringify({
      refreshToken: session.refreshToken,
    }),
    skipRefresh: true,
    headers: session.accessToken
      ? { Authorization: `Bearer ${session.accessToken}` }
      : undefined,
  });
}

function readRefreshTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(authStorageKey);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<AuthSession>;
    return parsed.refreshToken ?? null;
  } catch {
    return null;
  }
}
