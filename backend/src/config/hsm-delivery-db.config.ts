export type HsmDeliveryDbConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

export function getHsmDeliveryDbConfig(
  env: NodeJS.ProcessEnv = process.env,
): HsmDeliveryDbConfig | null {
  const host = env.MYSQL_HOST?.trim();
  const database = env.MYSQL_DATABASE?.trim();
  const user = env.MYSQL_USER?.trim();

  if (!host || !database || !user) {
    return null;
  }

  const port = Number(env.MYSQL_PORT ?? '3306');

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 3306,
    database,
    user,
    password: env.MYSQL_PASSWORD ?? '',
  };
}
