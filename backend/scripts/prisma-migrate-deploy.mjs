import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { loadBackendEnv } from './load-env.mjs';

const backendRoot = path.resolve(import.meta.dirname, '..');
const prismaBin =
  process.platform === 'win32'
    ? path.join(backendRoot, 'node_modules', '.bin', 'prisma.cmd')
    : path.join(backendRoot, 'node_modules', '.bin', 'prisma');

const env = loadBackendEnv();

execFileSync(prismaBin, ['migrate', 'deploy'], {
  cwd: backendRoot,
  stdio: 'inherit',
  env,
});
