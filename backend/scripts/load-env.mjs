import fs from 'node:fs';
import path from 'node:path';

const backendRoot = path.resolve(import.meta.dirname, '..');
const workspaceRoot = path.resolve(backendRoot, '..');
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
  const envPaths = [
    path.join(backendRoot, '.env'),
    path.join(workspaceRoot, '.env'),
  ];
  const mergedEnv = {
    DATABASE_URL: placeholderDatabaseUrl,
  };

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const content = fs.readFileSync(envPath, 'utf8');

    for (const line of content.split('\n')) {
      const parsed = parseEnvLine(line);

      if (!parsed) {
        continue;
      }

      mergedEnv[parsed.key] = parsed.value;
    }
  }

  Object.assign(mergedEnv, process.env);

  if (!mergedEnv.DATABASE_URL) {
    mergedEnv.DATABASE_URL = placeholderDatabaseUrl;
  }

  return mergedEnv;
}

export { backendRoot, workspaceRoot, placeholderDatabaseUrl };
