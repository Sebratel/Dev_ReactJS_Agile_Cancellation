import { PrismaClient } from '@prisma/client';
import { runDemoReset } from './seed/run-demo-reset';

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    await runDemoReset(prisma);
    process.stdout.write(
      'Reset de demonstracao concluido. Dados de dominio recriados com cenarios demo.\n',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write('Reset de demonstracao falhou.\n');

  if (error instanceof Error) {
    process.stderr.write(`${error.message}\n`);
  }

  process.exit(1);
});
