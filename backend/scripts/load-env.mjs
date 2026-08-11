import fs from 'node:fs';
import path from 'node:path';

const backendRoot = path.resolve(import.meta.dirname, '..');
const placeholderDatabaseUrl =
  'mysql://USER:PASSWORD@HOST:3306/DB_Cancellation_Plataform?connection_limit=5';

function parseEnvLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');

  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

export function loadBackendEnv() {
  const envPath = path.join(backendRoot, '.env');
  const mergedEnv = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? placeholderDatabaseUrl,
  };

  if (!fs.existsSync(envPath)) {
    return mergedEnv;
  }

  const content = fs.readFileSync(envPath, 'utf8');

  for (const line of content.split('\n')) {
    const parsed = parseEnvLine(line);

    if (!parsed) {
      continue;
    }

    mergedEnv[parsed.key] = parsed.value;
  }

  if (!mergedEnv.DATABASE_URL) {
    mergedEnv.DATABASE_URL = placeholderDatabaseUrl;
  }

  return mergedEnv;
}

export { backendRoot, placeholderDatabaseUrl };
