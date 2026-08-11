import { execFileSync } from 'node:child_process';
import path from 'node:path';

const backendRoot = path.resolve(import.meta.dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  ['run', 'prisma:generate'],
  ['run', 'prisma:migrate:dev'],
  ['run', 'prisma:seed'],
];

for (const stepArgs of steps) {
  execFileSync(npmCommand, stepArgs, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });
}
