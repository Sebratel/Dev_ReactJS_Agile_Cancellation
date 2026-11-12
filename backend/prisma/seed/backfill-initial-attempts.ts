/**
 * Backfill: tentativa automática inicial para casos existentes
 *
 * Cria uma CollectionAttempt com isAutomatic=true para cada caso que ainda
 * nao possui nenhuma tentativa automatica. Idempotente — pode ser executado
 * multiplas vezes sem duplicar dados.
 *
 * Uso: npm run db:backfill-initial-attempts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando casos sem tentativa automática inicial...');

  // Seleciona casos que nunca tiveram uma tentativa isAutomatic=true.
  const casesWithoutAutoAttempt = await prisma.collectionCase.findMany({
    where: {
      collectionAttempts: {
        none: { isAutomatic: true },
      },
    },
    select: {
      id: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (casesWithoutAutoAttempt.length === 0) {
    console.log(
      '✅ Nenhum caso pendente — todos já possuem tentativa automática.',
    );
    return;
  }

  console.log(`📋 ${casesWithoutAutoAttempt.length} caso(s) para processar...`);

  let created = 0;
  let failed = 0;

  for (const collectionCase of casesWithoutAutoAttempt) {
    try {
      await prisma.collectionAttempt.create({
        data: {
          collectionCaseId: collectionCase.id,
          performedByUserId: null,
          channel: 'WHATSAPP',
          result: 'NO_ANSWER',
          notes:
            'Mensagem automática enviada ao cliente antes da entrada na plataforma.',
          // Usa a data de criação do caso para que apareça como a tentativa
          // mais antiga na timeline (representa o contato pré-ingestão).
          attemptedAt: collectionCase.createdAt,
          isAutomatic: true,
        },
      });

      created += 1;
      process.stdout.write('.');
    } catch (err) {
      failed += 1;
      console.error(`\n❌ Falha no caso ${collectionCase.id}:`, err);
    }
  }

  console.log('\n');
  console.log(`✅ Tentativas criadas: ${created}`);

  if (failed > 0) {
    console.error(`❌ Falhas: ${failed}`);
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('Erro fatal no backfill:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
