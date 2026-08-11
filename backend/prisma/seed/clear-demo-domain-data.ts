import type { PrismaClient } from '@prisma/client';

export async function clearDemoDomainData(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.cancellationStep.deleteMany(),
    prisma.cancellationProcess.deleteMany(),
    prisma.paymentPromise.deleteMany(),
    prisma.collectionAttempt.deleteMany(),
    prisma.collectionCase.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.customer.deleteMany(),
  ]);
}
