import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { backendRoot, loadBackendEnv } from './load-env.mjs';

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
const seedEntry = path.join(backendRoot, 'prisma', 'seed.ts');

execFileSync(
  process.execPath,
  [
    require.resolve('ts-node/dist/bin.js'),
    '--compiler-options',
    JSON.stringify({ module: 'commonjs' }),
    seedEntry,
  ],
  {
    cwd: backendRoot,
    stdio: 'inherit',
    env: loadBackendEnv(),
  },
);
