import { appEnv } from '@/app/config/env';
import { ApiError } from '@/services/api/api-error';
import {
  getAccessToken,
  getRefreshToken,
  notifyUnauthorized,
  updateSessionTokens,
} from '@/services/api/auth-session-bridge';
import {
  type ApiErrorPayload,
  type ApiRequestConfig,
  type ApiSuccessResponse,
} from '@/services/api/api-types';
import { type ApiEnvelope } from '@/services/api/types/api-envelope';

const defaultHeaders: HeadersInit = {
  'Content-Type': 'application/json',
};

const DEFAULT_TIMEOUT_MS = 10_000;
const AUTH_PATHS_WITHOUT_REFRESH = ['/auth/login', '/auth/refresh'];

type BackendErrorBody = {
  statusCode?: number;
  error?: {
    message?: string | string[];
    code?: string;
    details?: string;
  };
  message?: string;
};

type RefreshResponseBody = {
  accessToken: string;
  refreshToken: string;
};

function parseErrorPayload(payload: BackendErrorBody | null): ApiErrorPayload {
  if (!payload) {
    return { message: 'Falha inesperada na comunicação com a API.' };
  }

  const nestedError = payload.error;
  const nestedMessage = nestedError?.message;
  const message = Array.isArray(nestedMessage)
    ? nestedMessage.join(', ')
    : (nestedMessage ??
      payload.message ??
      'Falha inesperada na comunicação com a API.');

  return {
    message,
    code: nestedError?.code,
    details: nestedError?.details,
  };
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(baseUrl: string): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: defaultHeaders,
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          return false;
        }

        const envelope = (await response
          .json()
          .catch(() => null)) as ApiEnvelope<RefreshResponseBody> | null;

        if (!envelope?.data?.accessToken || !envelope.data.refreshToken) {
          return false;
        }

        updateSessionTokens({
          accessToken: envelope.data.accessToken,
          refreshToken: envelope.data.refreshToken,
        });

        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export class HttpClient {
  constructor(
    private readonly baseUrl = '',
    private readonly defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async request<TData>(
    config: ApiRequestConfig,
  ): Promise<ApiSuccessResponse<TData>> {
    try {
      return await this.executeRequest<TData>(config);
    } catch (error) {
      const shouldAttemptRefresh =
        error instanceof ApiError &&
        error.status === 401 &&
        !config.skipAuth &&
        !config.skipRefresh &&
        !AUTH_PATHS_WITHOUT_REFRESH.some((path) =>
          config.path.startsWith(path),
        );

      if (!shouldAttemptRefresh) {
        throw error;
      }

      const refreshed = await refreshAccessToken(this.baseUrl);

      if (!refreshed) {
        notifyUnauthorized();
        throw error;
      }

      return this.executeRequest<TData>(config);
    }
  }

  private async executeRequest<TData>({
    path,
    method = 'GET',
    body = null,
    headers,
    signal,
    timeoutMs,
    skipAuth = false,
  }: ApiRequestConfig): Promise<ApiSuccessResponse<TData>> {
    const controller = new AbortController();
    const timeout = timeoutMs ?? this.defaultTimeoutMs;
    const timeoutId = window.setTimeout(() => controller.abort(), timeout);

    const abortFromCaller = () => controller.abort();
    signal?.addEventListener('abort', abortFromCaller);

    const accessToken = getAccessToken();
    const authHeaders: HeadersInit =
      !skipAuth && accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {};

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        body,
        headers: {
          ...defaultHeaders,
          ...authHeaders,
          ...headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response
          .json()
          .catch(() => null)) as BackendErrorBody | null;

        throw new ApiError(response.status, parseErrorPayload(payload));
      }

      const envelope = (await response
        .json()
        .catch(() => null)) as ApiEnvelope<TData> | null;

      if (!envelope || envelope.data === undefined) {
        throw new ApiError(500, {
          message: 'Resposta inválida da API.',
        });
      }

      return {
        data: envelope.data,
        status: response.status,
        timestamp: envelope.timestamp,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(408, {
          message: 'Tempo limite excedido ao comunicar com a API.',
        });
      }

      throw new ApiError(503, {
        message: 'Não foi possível conectar ao backend.',
      });
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }
}

export const httpClient = new HttpClient(appEnv.apiBaseUrl);

export { refreshAccessToken };
