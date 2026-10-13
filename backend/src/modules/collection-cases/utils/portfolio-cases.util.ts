import { CollectionStatus, Prisma } from '@prisma/client';
import type { PrismaService } from '@/database/prisma/prisma.service';

// Casos considerados "em carteira" (ativos) — mesma regra da distribuicao e
// do workload (ver users.service.ts): exclui CLOSED/RECOVERED/PAYMENT_MADE/
// RENEGOTIATED e AWAITING_PAYMENT (status que nenhum fluxo grava hoje).
export const PORTFOLIO_ACTIVE_STATUSES: CollectionStatus[] = [
  CollectionStatus.WAITING_TRIAGE,
  CollectionStatus.IN_COLLECTION,
  CollectionStatus.NO_RESPONSE,
  CollectionStatus.ELIGIBLE_FOR_CANCELLATION,
  CollectionStatus.CANCELLATION_IN_PROGRESS,
];

/**
 * Conta, por atendente, os casos ATIVOS com contato manual dentro do ciclo
 * atual (`attemptedAt >= cycleStartedAt`; sem `cycleStartedAt`, qualquer
 * contato manual). O Prisma nao compara campo do filho com campo do pai, entao
 * a condicao vai em SQL. Chave `null` = casos sem responsavel.
 */
export async function countContactedInCycleByAgent(
  prisma: Pick<PrismaService, '$queryRaw'>,
  assignedUserId?: string,
): Promise<Map<string | null, number>> {
  const scope = assignedUserId
    ? Prisma.sql`AND cc.assignedUserId = ${assignedUserId}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{ assignedUserId: string | null; total: bigint | number }>
  >(Prisma.sql`
    SELECT cc.assignedUserId AS assignedUserId, COUNT(*) AS total
    FROM collection_cases cc
    WHERE cc.status IN (${Prisma.join(PORTFOLIO_ACTIVE_STATUSES)})
      ${scope}
      AND EXISTS (
        SELECT 1 FROM collection_attempts a
        WHERE a.collectionCaseId = cc.id
          AND a.isAutomatic = 0
          AND (cc.cycleStartedAt IS NULL OR a.attemptedAt >= cc.cycleStartedAt)
      )
    GROUP BY cc.assignedUserId
  `);

  return new Map(rows.map((row) => [row.assignedUserId, Number(row.total)]));
}

/**
 * Casos com contato manual ANTIGO apenas: ha tentativa manual, mas nenhuma
 * dentro do ciclo atual (caso reaberto, cycleStartedAt posterior ao contato).
 * Sao "nao contatados" pela definicao unica (contato manual com
 * attemptedAt >= cycleStartedAt, ou qualquer manual se cycleStartedAt nulo).
 * Conjunto pequeno (so reabertos) — usado como excecao nos filtros Prisma,
 * que nao comparam campo do filho com campo do pai.
 */
export async function findStaleContactCaseIds(
  prisma: Pick<PrismaService, '$queryRaw'>,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT cc.id AS id
    FROM collection_cases cc
    WHERE cc.cycleStartedAt IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM collection_attempts a
        WHERE a.collectionCaseId = cc.id AND a.isAutomatic = 0
      )
      AND NOT EXISTS (
        SELECT 1 FROM collection_attempts a
        WHERE a.collectionCaseId = cc.id
          AND a.isAutomatic = 0
          AND a.attemptedAt >= cc.cycleStartedAt
      )
  `);

  return rows.map((row) => row.id);
}
