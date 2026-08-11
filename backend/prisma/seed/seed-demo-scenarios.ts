import {
  CancellationStepStatus,
  CancellationStatus,
  CollectionStatus,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';
import { DEFAULT_CANCELLATION_STEP_DEFINITIONS } from '../../src/modules/cancellations/constants/default-cancellation-steps.constants';
import { SEED_DEMO_SCENARIO_CASES } from './definitions';

function buildDefaultCancellationStepsForPrisma(cancellationProcessId: string) {
  return DEFAULT_CANCELLATION_STEP_DEFINITIONS.map((definition) => ({
    cancellationProcessId,
    name: definition.stepCode,
    stepOrder: definition.stepOrder,
    status: CancellationStepStatus.PENDING,
  }));
}

type SeedDemoScenariosContext = {
  adminUserId: string;
  financeUserName: string;
};

async function findCaseByExternalId(prisma: PrismaClient, externalId: string) {
  const collectionCase = await prisma.collectionCase.findUnique({
    where: { externalId },
  });

  if (!collectionCase) {
    throw new Error(`Caso demo ${externalId} nao encontrado apos seed base.`);
  }

  return collectionCase;
}

async function upsertCancellationProcess(input: {
  prisma: PrismaClient;
  externalId: string;
  collectionCaseId: string;
  contractId: string;
  customerId: string;
  status: CancellationStatus;
  startedAt: Date;
  completedAt?: Date | null;
}) {
  return input.prisma.cancellationProcess.upsert({
    where: { externalId: input.externalId },
    update: {
      collectionCaseId: input.collectionCaseId,
      contractId: input.contractId,
      customerId: input.customerId,
      status: input.status,
      startedAt: input.startedAt,
      completedAt: input.completedAt ?? null,
    },
    create: {
      externalId: input.externalId,
      collectionCaseId: input.collectionCaseId,
      contractId: input.contractId,
      customerId: input.customerId,
      status: input.status,
      startedAt: input.startedAt,
      completedAt: input.completedAt ?? null,
    },
  });
}

async function replaceCancellationSteps(
  prisma: PrismaClient,
  cancellationProcessId: string,
  steps: Array<{
    cancellationProcessId: string;
    name: string;
    stepOrder: number;
    status: CancellationStepStatus;
    completedAt?: Date | null;
    metadata?: Prisma.InputJsonValue;
  }>,
) {
  await prisma.cancellationStep.deleteMany({
    where: { cancellationProcessId },
  });

  await prisma.cancellationStep.createMany({
    data: steps.map((step) => ({
      cancellationProcessId: step.cancellationProcessId,
      name: step.name,
      stepOrder: step.stepOrder,
      status: step.status,
      completedAt: step.completedAt ?? null,
      metadata: step.metadata,
    })),
  });
}

export async function seedDemoScenarios(
  prisma: PrismaClient,
  context: SeedDemoScenariosContext,
): Promise<void> {
  const inProgressCase = await findCaseByExternalId(
    prisma,
    SEED_DEMO_SCENARIO_CASES.cancellationInProgress,
  );
  const completedCase = await findCaseByExternalId(
    prisma,
    SEED_DEMO_SCENARIO_CASES.cancellationCompleted,
  );

  const inProgressStartedAt = new Date('2026-06-01T10:00:00.000Z');
  const inProgressProcess = await upsertCancellationProcess({
    prisma,
    externalId: 'seed-cancel-process-in-progress',
    collectionCaseId: inProgressCase.id,
    contractId: inProgressCase.contractId,
    customerId: inProgressCase.customerId,
    status: CancellationStatus.IN_PROGRESS,
    startedAt: inProgressStartedAt,
    completedAt: null,
  });

  await replaceCancellationSteps(
    prisma,
    inProgressProcess.id,
    buildDefaultCancellationStepsForPrisma(inProgressProcess.id),
  );

  await prisma.collectionCase.update({
    where: { id: inProgressCase.id },
    data: {
      status: CollectionStatus.CANCELLATION_IN_PROGRESS,
    },
  });

  const completedStartedAt = new Date('2026-05-15T08:00:00.000Z');
  const completedAt = new Date('2026-05-20T16:30:00.000Z');
  const completedProcess = await upsertCancellationProcess({
    prisma,
    externalId: 'seed-cancel-process-completed',
    collectionCaseId: completedCase.id,
    contractId: completedCase.contractId,
    customerId: completedCase.customerId,
    status: CancellationStatus.COMPLETED,
    startedAt: completedStartedAt,
    completedAt,
  });

  await replaceCancellationSteps(
    prisma,
    completedProcess.id,
    DEFAULT_CANCELLATION_STEP_DEFINITIONS.map((definition) => ({
      cancellationProcessId: completedProcess.id,
      name: definition.stepCode,
      stepOrder: definition.stepOrder,
      status: CancellationStepStatus.COMPLETED,
      completedAt,
      metadata: {
        completedByName: context.financeUserName,
      },
    })),
  );

  await prisma.collectionCase.update({
    where: { id: completedCase.id },
    data: {
      status: CollectionStatus.CLOSED,
    },
  });

  await prisma.collectionCase.update({
    where: { externalId: SEED_DEMO_SCENARIO_CASES.sendToCancellationReady },
    data: {
      status: CollectionStatus.ELIGIBLE_FOR_CANCELLATION,
      assignedUserId: context.adminUserId,
    },
  });

  await prisma.collectionCase.update({
    where: { externalId: SEED_DEMO_SCENARIO_CASES.attemptReady },
    data: {
      status: CollectionStatus.IN_COLLECTION,
      assignedUserId: context.adminUserId,
    },
  });

  await prisma.collectionCase.update({
    where: { externalId: SEED_DEMO_SCENARIO_CASES.promiseReady },
    data: {
      status: CollectionStatus.IN_COLLECTION,
      assignedUserId: context.adminUserId,
    },
  });
}
