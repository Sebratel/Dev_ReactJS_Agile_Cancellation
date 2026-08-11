import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/api/api-error';
import {
  getAccessToken,
  notifyUnauthorized,
  setAccessTokenGetter,
  setRefreshTokenGetter,
  setSessionTokensUpdater,
  setUnauthorizedHandler,
  updateSessionTokens,
} from '@/services/api/auth-session-bridge';
import { HttpClient } from '@/services/api/http-client';
import {
  TEST_API_TOKEN,
  TEST_ROTATED_REFRESH_TOKEN,
  TEST_REFRESH_TOKEN,
} from '@/test/test-credentials';

describe('HttpClient auth integration', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    setAccessTokenGetter(() => TEST_API_TOKEN);
    setRefreshTokenGetter(() => TEST_REFRESH_TOKEN);
    setSessionTokensUpdater(() => undefined);
    setUnauthorizedHandler(() => undefined);
  });

  it('envia Authorization quando token disponivel', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: { ok: true },
          timestamp: '2026-06-10T12:00:00.000Z',
        }),
    });

    const client = new HttpClient('http://localhost:4000');
    await client.request<{ ok: boolean }>({ path: '/dashboard/summary' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;

    expect(headers.Authorization).toBe(`Bearer ${TEST_API_TOKEN}`);
  });

  it('401 dispara refresh e reexecuta request original', async () => {
    const tokensUpdater = vi.fn();
    setSessionTokensUpdater(tokensUpdater);

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            statusCode: 401,
            error: { message: 'Token expirado.' },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            data: {
              accessToken: TEST_ROTATED_REFRESH_TOKEN,
              refreshToken: TEST_ROTATED_REFRESH_TOKEN,
            },
            timestamp: '2026-06-10T12:00:00.000Z',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: { ok: true },
            timestamp: '2026-06-10T12:00:00.000Z',
          }),
      });

    let currentAccessToken = TEST_API_TOKEN;
    setAccessTokenGetter(() => currentAccessToken);
    setSessionTokensUpdater(({ accessToken }) => {
      currentAccessToken = accessToken;
      tokensUpdater(accessToken);
    });

    const client = new HttpClient('http://localhost:4000');
    const response = await client.request<{ ok: boolean }>({
      path: '/collection-cases',
    });

    expect(response.data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(tokensUpdater).toHaveBeenCalledWith(TEST_ROTATED_REFRESH_TOKEN);

    const retryCall = fetchMock.mock.calls[2] as [string, RequestInit];
    const retryHeaders = retryCall[1].headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe(
      `Bearer ${TEST_ROTATED_REFRESH_TOKEN}`,
    );
  });

  it('refresh falho limpa sessao via handler', async () => {
    const unauthorizedHandler = vi.fn();
    setUnauthorizedHandler(unauthorizedHandler);

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            statusCode: 401,
            error: { message: 'Token expirado.' },
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            statusCode: 401,
            error: { message: 'Refresh inválido.' },
          }),
      });

    const client = new HttpClient('http://localhost:4000');

    await expect(
      client.request({ path: '/collection-cases' }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it('nao envia Authorization quando skipAuth=true', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: { accessToken: TEST_API_TOKEN, user: {} },
          timestamp: '2026-06-10T12:00:00.000Z',
        }),
    });

    const client = new HttpClient('http://localhost:4000');
    const idToken = ['mock', 'a@ger.local'].join(':');
    await client.request({
      path: '/auth/google',
      method: 'POST',
      body: JSON.stringify({ idToken }),
      skipAuth: true,
      skipRefresh: true,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;

    expect(headers.Authorization).toBeUndefined();
  });

  it('notifyUnauthorized executa handler registrado', () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    notifyUnauthorized();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('updateSessionTokens usa updater registrado', () => {
    const updater = vi.fn();
    setSessionTokensUpdater(updater);

    updateSessionTokens({
      accessToken: TEST_API_TOKEN,
      refreshToken: TEST_REFRESH_TOKEN,
    });

    expect(updater).toHaveBeenCalledWith({
      accessToken: TEST_API_TOKEN,
      refreshToken: TEST_REFRESH_TOKEN,
    });
  });

  it('getAccessToken usa getter registrado', () => {
    expect(getAccessToken()).toBe(TEST_API_TOKEN);
  });
});
