'use strict';

// Autocura da migration 20261027120000_add_last_contact_at_to_collection_cases, marcada como
// falha (P3009) no banco de producao: o `prisma migrate deploy` se recusa a aplicar QUALQUER
// migration enquanto houver uma falha aberta. Como o MySQL nao desfaz DDL, ela pode ter parado
// entre a coluna e o indice. Este passo confere o estado real e resolve o historico do Prisma.
// Roda antes do `migrate deploy` (ver Dockerfile). Idempotente e NUNCA derruba a API: qualquer
// erro aqui so e logado. Sem migration falha aberta, nao faz nada.

const MIGRATION = '20261027120000_add_last_contact_at_to_collection_cases';
const TABLE = 'collection_cases';
const COLUMN = 'lastContactAt';
const INDEX = 'collection_cases_lastContactAt_idx';

async function heal({ prisma, resolve, log = console.log }) {
  const failed = await prisma.$queryRawUnsafe(
    'SELECT migration_name FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NULL AND rolled_back_at IS NULL',
    MIGRATION,
  );
  if (failed.length === 0) {
    return 'nothing-to-do';
  }

  const columns = await prisma.$queryRawUnsafe(
    'SELECT 1 AS ok FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    TABLE,
    COLUMN,
  );
  const indexes = await prisma.$queryRawUnsafe(
    'SELECT 1 AS ok FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
    TABLE,
    INDEX,
  );
  const hasColumn = columns.length > 0;
  const hasIndex = indexes.length > 0;

  if (hasColumn && !hasIndex) {
    log(`[heal-migration] criando indice ${INDEX} que faltava`);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX \`${INDEX}\` ON \`${TABLE}\`(\`${COLUMN}\`)`,
    );
  }

  if (hasColumn) {
    log(`[heal-migration] ${MIGRATION}: coluna presente -> resolve --applied`);
    await resolve('--applied', MIGRATION);
    return 'applied';
  }

  if (hasIndex) {
    // indice sem coluna nao existe; estado inconsistente, nao arrisca
    throw new Error('indice existe sem a coluna; resolver manualmente');
  }

  log(`[heal-migration] ${MIGRATION}: nada aplicado -> resolve --rolled-back`);
  await resolve('--rolled-back', MIGRATION);
  return 'rolled-back';
}

async function main() {
  const { execFileSync } = require('node:child_process');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const result = await heal({
      prisma,
      resolve: (flag, name) =>
        execFileSync(
          process.execPath,
          [
            require.resolve('prisma/build/index.js'),
            'migrate',
            'resolve',
            flag,
            name,
          ],
          { stdio: 'inherit' },
        ),
    });
    console.log(`[heal-migration] resultado: ${result}`);
  } catch (error) {
    console.error(
      `[heal-migration] falhou (a API sobe mesmo assim): ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

if (require.main === module) {
  void main();
}

module.exports = { heal, MIGRATION };
