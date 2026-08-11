import type { PrismaClient } from '@prisma/client';
import { clearDemoDomainData } from './clear-demo-domain-data';
import {
  assertResetDemoConfirmed,
  assertResetDemoEnvironment,
} from './reset-demo-guards';
import { runDevelopmentSeed } from './run-seed';

export async function runDemoReset(
  prisma: PrismaClient,
  options?: {
    nodeEnv?: string;
    argv?: string[];
  },
): Promise<void> {
  assertResetDemoEnvironment(options?.nodeEnv);
  assertResetDemoConfirmed(options?.argv);

  await clearDemoDomainData(prisma);
  await runDevelopmentSeed(prisma);
}
