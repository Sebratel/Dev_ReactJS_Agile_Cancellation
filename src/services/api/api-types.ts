export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiRequestConfig = {
  path: string;
  method?: HttpMethod;
  body?: BodyInit | null;
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

export type ApiSuccessResponse<TData> = {
  data: TData;
  status: number;
  timestamp: string;
};

export type ApiErrorPayload = {
  message: string;
  code?: string;
  details?: string;
};
