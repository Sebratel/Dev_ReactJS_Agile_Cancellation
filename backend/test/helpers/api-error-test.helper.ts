export function getApiErrorCode(body: unknown) {
  const payload = body as {
    code?: string;
    error?: {
      code?: string;
    };
  };

  return payload.error?.code ?? payload.code;
}
