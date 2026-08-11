import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { backendRoot, loadBackendEnv } from './load-env.mjs';

const require = createRequire(import.meta.url);
const resetDemoEntry = path.join(backendRoot, 'prisma', 'reset-demo.ts');

const env = loadBackendEnv();
const args = process.argv.slice(2);
const confirmed =
  args.includes('--confirm') || env.RESET_DEMO_CONFIRM === 'true';

if (env.NODE_ENV === 'production') {
  process.stderr.write(
    'db:reset-demo nao pode ser executado com NODE_ENV=production.\n',
  );
  process.exit(1);
}

if (!confirmed) {
  process.stderr.write(
    'Operacao destrutiva: limpa dados de dominio demonstraveis e recria o seed.\n',
  );
  process.stderr.write(
    'Para continuar, execute: npm run db:reset-demo:confirm\n',
  );
  process.stderr.write('Ou: RESET_DEMO_CONFIRM=true npm run db:reset-demo\n');
  process.exit(1);
}

execFileSync(
  process.execPath,
  [
    require.resolve('ts-node/dist/bin.js'),
    '-r',
    'tsconfig-paths/register',
    '--compiler-options',
    JSON.stringify({ module: 'commonjs' }),
    resetDemoEntry,
  ],
  {
    cwd: backendRoot,
    stdio: 'inherit',
    env: {
      ...env,
      RESET_DEMO_CONFIRM: 'true',
    },
  },
);
