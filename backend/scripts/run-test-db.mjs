import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { loadBackendEnv } from './load-env.mjs';

const backendRoot = path.resolve(import.meta.dirname, '..');
const jestCli = path.join(
  backendRoot,
  'node_modules',
  'jest',
  'bin',
  'jest.js',
);

execFileSync(
  process.execPath,
  [jestCli, '--runInBand', 'test/db.integration.spec.ts'],
  {
    cwd: backendRoot,
    stdio: 'inherit',
    env: {
      ...loadBackendEnv(),
      RUN_DB_INTEGRATION: 'true',
      DATA_SOURCE_MODE: 'database',
      PRISMA_AUTO_CONNECT: 'true',
      NODE_ENV: 'test',
    },
  },
);
