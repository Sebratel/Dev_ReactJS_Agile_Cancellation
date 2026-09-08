import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { loadBackendEnv } from './load-env.mjs';

const require = createRequire(import.meta.url);
const backendRoot = path.resolve(import.meta.dirname, '..');
const prismaCli = require.resolve('prisma/build/index.js');

execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: loadBackendEnv(),
});
