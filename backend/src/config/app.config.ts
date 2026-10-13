export type AppConfig = {
  appName: string;
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  databaseUrl: string;
  timezone: string;
  dataSourceMode: 'mock' | 'database';
  // Valor do `trust proxy` do Express (false = nao confia em X-Forwarded-*).
  trustProxy: boolean | number | string;
};

/**
 * TRUST_PROXY: numero de hops (ex.: 1 = nginx na frente), lista de IPs/CIDRs,
 * ou true/false. Padrao: 1 hop em producao (atras do nginx), false fora dela.
 * Sem isso o rate limit (Throttler) enxerga o IP do proxy e limita todos os
 * usuarios juntos.
 */
export function parseTrustProxy(
  value: string | undefined,
  isProd: boolean,
): AppConfig['trustProxy'] {
  const raw = value?.trim();

  if (!raw) {
    return isProd ? 1 : false;
  }

  if (raw === 'true') return true;
  if (raw === 'false') return false;

  return /^[0-9]+$/.test(raw) ? Number(raw) : raw;
}

export function getAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const isProd = env.NODE_ENV === 'production';
  const corsOrigin = env.CORS_ORIGIN;

  if (isProd && (!corsOrigin || corsOrigin.includes('localhost'))) {
    throw new Error(
      'CORS_ORIGIN nao configurado ou aponta para localhost em producao.',
    );
  }

  return {
    appName: env.APP_NAME ?? 'ger-collection-cancellation-api',
    port: Number(env.PORT ?? 4000),
    nodeEnv: env.NODE_ENV ?? 'development',
    corsOrigin: corsOrigin ?? 'http://localhost:5173',
    databaseUrl:
      env.DATABASE_URL ??
      'mysql://USER:PASSWORD@HOST:3306/DB_Cancellation_Plataform?connection_limit=5',
    timezone: env.APP_TIMEZONE ?? 'UTC',
    dataSourceMode: env.DATA_SOURCE_MODE === 'database' ? 'database' : 'mock',
    trustProxy: parseTrustProxy(env.TRUST_PROXY, isProd),
  };
}
