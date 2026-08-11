import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadBackendEnv } from './load-env.mjs';

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');

execFileSync(process.execPath, [prismaCli, 'migrate', 'status'], {
  stdio: 'inherit',
  env: loadBackendEnv(),
});
