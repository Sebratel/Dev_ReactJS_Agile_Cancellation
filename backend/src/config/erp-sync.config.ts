export type ErpSyncDbConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

export type ErpSyncConfig = {
  enabled: boolean;
  db: ErpSyncDbConfig | null;
};

function toBool(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function getErpSyncConfig(
  env: NodeJS.ProcessEnv = process.env,
): ErpSyncConfig {
  const enabled = toBool(env.ERP_SYNC_ENABLED);
  const host = env.ERP_DB_HOST?.trim();
  const port = Number(env.ERP_DB_PORT ?? '5432');
  const database = env.ERP_DB_NAME?.trim();
  const user = env.ERP_DB_USER?.trim();
  const password = env.ERP_DB_PASSWORD ?? '';

  if (!host || !database || !user) {
    return { enabled: false, db: null };
  }

  return {
    enabled,
    db: { host, port, database, user, password },
  };
}
