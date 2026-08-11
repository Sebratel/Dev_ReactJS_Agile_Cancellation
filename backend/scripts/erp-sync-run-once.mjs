import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { backendRoot, loadBackendEnv } from './load-env.mjs';

const require = createRequire(import.meta.url);
const syncEntry = path.join(backendRoot, 'scripts', 'erp-sync-run-once.ts');

execFileSync(
  process.execPath,
  [
    require.resolve('ts-node/dist/bin.js'),
    '-r',
    require.resolve('tsconfig-paths/register'),
    '--compiler-options',
    JSON.stringify({ module: 'commonjs' }),
    syncEntry,
  ],
  {
    cwd: backendRoot,
    stdio: 'inherit',
    env: loadBackendEnv(),
  },
);
