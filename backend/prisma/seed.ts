import { PrismaClient } from '@prisma/client';
import { runDevelopmentSeed } from './seed/run-seed';

if (process.env.NODE_ENV === 'production') {
  process.stderr.write(
    'ERRO: seed de desenvolvimento bloqueado em NODE_ENV=production.\n',
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    await runDevelopmentSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write('Seed de desenvolvimento falhou.\n');

  if (error instanceof Error) {
    process.stderr.write(`${error.message}\n`);
  }

  process.exit(1);
});
