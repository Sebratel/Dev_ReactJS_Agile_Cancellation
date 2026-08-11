import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadBackendEnv } from './load-env.mjs';

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
const rawArgs = process.argv.slice(2);
const args =
  rawArgs.length > 0 && !rawArgs[0].startsWith('-')
    ? ['--name', ...rawArgs]
    : rawArgs;

execFileSync(process.execPath, [prismaCli, 'migrate', 'dev', ...args], {
  stdio: 'inherit',
  env: loadBackendEnv(),
});
