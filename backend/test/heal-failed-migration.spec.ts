/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- script CJS de runtime (prisma/), carregado via require */
const { heal, MIGRATION } = require('../prisma/heal-failed-migration.cjs');

function build(opts: {
  failed: boolean;
  column: boolean;
  index: boolean;
  table?: boolean;
}) {
  const rows = (has: boolean) => (has ? [{ ok: 1 }] : []);
  const queryRawUnsafe = jest.fn((sql: string) => {
    if (sql.includes('information_schema.TABLES')) {
      return Promise.resolve(rows(opts.table ?? true));
    }
    if (sql.includes('_prisma_migrations')) {
      return Promise.resolve(
        opts.failed ? [{ migration_name: MIGRATION }] : [],
      );
    }
    if (sql.includes('COLUMNS')) return Promise.resolve(rows(opts.column));
    return Promise.resolve(rows(opts.index));
  });
  const executeRawUnsafe = jest.fn().mockResolvedValue(1);
  const resolve = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    $queryRawUnsafe: queryRawUnsafe,
    $executeRawUnsafe: executeRawUnsafe,
  };
  return { prisma, executeRawUnsafe, resolve };
}

describe('heal-failed-migration (P3009)', () => {
  const log = jest.fn();

  it('banco novo (sem _prisma_migrations): nao consulta nem resolve', async () => {
    const { prisma, resolve } = build({
      failed: false,
      column: false,
      index: false,
      table: false,
    });
    await expect(heal({ prisma, resolve, log })).resolves.toBe('nothing-to-do');
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('nao faz nada quando a migration nao esta falha', async () => {
    const { prisma, resolve, executeRawUnsafe } = build({
      failed: false,
      column: true,
      index: true,
    });
    await expect(heal({ prisma, resolve, log })).resolves.toBe('nothing-to-do');
    expect(resolve).not.toHaveBeenCalled();
    expect(executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('coluna e indice presentes -> resolve --applied', async () => {
    const { prisma, resolve, executeRawUnsafe } = build({
      failed: true,
      column: true,
      index: true,
    });
    await expect(heal({ prisma, resolve, log })).resolves.toBe('applied');
    expect(resolve).toHaveBeenCalledWith('--applied', MIGRATION);
    expect(executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('so a coluna presente -> cria o indice e resolve --applied', async () => {
    const { prisma, resolve, executeRawUnsafe } = build({
      failed: true,
      column: true,
      index: false,
    });
    await expect(heal({ prisma, resolve, log })).resolves.toBe('applied');
    expect(executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('CREATE INDEX'),
    );
    expect(resolve).toHaveBeenCalledWith('--applied', MIGRATION);
  });

  it('nada aplicado -> resolve --rolled-back (o deploy reaplica)', async () => {
    const { prisma, resolve } = build({
      failed: true,
      column: false,
      index: false,
    });
    await expect(heal({ prisma, resolve, log })).resolves.toBe('rolled-back');
    expect(resolve).toHaveBeenCalledWith('--rolled-back', MIGRATION);
  });

  it('indice sem coluna e inconsistente: nao resolve e lanca', async () => {
    const { prisma, resolve } = build({
      failed: true,
      column: false,
      index: true,
    });
    await expect(heal({ prisma, resolve, log })).rejects.toThrow(
      'resolver manualmente',
    );
    expect(resolve).not.toHaveBeenCalled();
  });
});
