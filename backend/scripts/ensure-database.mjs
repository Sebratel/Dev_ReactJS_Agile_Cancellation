import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadBackendEnv } from './load-env.mjs';

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
const env = loadBackendEnv();
const parsedUrl = new URL(env.DATABASE_URL);
const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));
parsedUrl.pathname = '/';
const serverUrl = parsedUrl.toString();

if (!databaseName) {
  process.stderr.write('DATABASE_URL deve incluir o nome do banco.\n');
  process.exit(1);
}

const sql = `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;

execFileSync(
  process.execPath,
  [prismaCli, 'db', 'execute', '--stdin', '--url', serverUrl],
  {
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
    env,
  },
);

process.stdout.write(`Banco ${databaseName} verificado/criado.\n`);
