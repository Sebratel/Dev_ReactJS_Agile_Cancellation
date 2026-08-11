import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const backendRoot = path.resolve(import.meta.dirname, '..');
const prismaCli = require.resolve('prisma/build/index.js');
const placeholderDatabaseUrl =
  'mysql://USER:PASSWORD@HOST:3306/DB_Cancellation_Plataform?connection_limit=5';

execFileSync(process.execPath, [prismaCli, 'format'], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: placeholderDatabaseUrl,
  },
});
