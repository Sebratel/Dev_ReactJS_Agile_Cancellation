export type AppConfig = {
  appName: string;
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  databaseUrl: string;
  timezone: string;
  dataSourceMode: 'mock' | 'database';
};

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
  };
}
