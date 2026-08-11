const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'refreshtokenhash',
  'accesstoken',
  'refreshtoken',
  'token',
  'secret',
  'authorization',
]);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(record)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue;
    }

    sanitized[key] = sanitizeValue(nestedValue);
  }

  return sanitized;
}

export function sanitizeAuditMetadata(
  metadata: unknown,
): Record<string, unknown> {
  const sanitized = sanitizeValue(metadata);

  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    return {};
  }

  return sanitized as Record<string, unknown>;
}
