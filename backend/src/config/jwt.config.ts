export type JwtConfig = {
  secret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
};

const INSECURE_PLACEHOLDERS = [
  'change-me',
  'change-me-in-local-env',
  'ger-dev-jwt-secret-change-me',
  'secret',
];

export function getJwtConfig(env: NodeJS.ProcessEnv = process.env): JwtConfig {
  const secret = env.JWT_SECRET;
  const isProd = env.NODE_ENV === 'production';

  if (!secret || secret.trim() === '') {
    if (isProd) {
      throw new Error(
        'JWT_SECRET nao configurado. Defina um segredo forte em producao.',
      );
    }
  } else if (isProd) {
    if (INSECURE_PLACEHOLDERS.some((p) => secret.includes(p))) {
      throw new Error(
        'JWT_SECRET contem um valor placeholder. Defina um segredo forte em producao.',
      );
    }
    if (secret.length < 32) {
      throw new Error(
        'JWT_SECRET deve ter pelo menos 32 caracteres em producao.',
      );
    }
  }

  return {
    secret: secret ?? 'ger-dev-jwt-secret-local-only',
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN ?? env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  };
}
