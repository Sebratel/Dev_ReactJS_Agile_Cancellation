export function calculateFulfillmentRate(
  fulfilledPromises: number,
  brokenPromises: number,
): number {
  const denominator = fulfilledPromises + brokenPromises;

  if (denominator === 0) {
    return 0;
  }

  return fulfilledPromises / denominator;
}

export function calculateAverageCompletionDays(
  processes: Array<{ createdAt: Date; completedAt: Date | null }>,
): number {
  const completionDays = processes
    .filter((process): process is { createdAt: Date; completedAt: Date } =>
      Boolean(process.completedAt),
    )
    .map((process) => {
      const elapsedMs =
        process.completedAt.getTime() - process.createdAt.getTime();

      return elapsedMs / (1000 * 60 * 60 * 24);
    })
    .filter((days) => days >= 0);

  if (completionDays.length === 0) {
    return 0;
  }

  const totalDays = completionDays.reduce((sum, days) => sum + days, 0);
  const average = totalDays / completionDays.length;

  return Math.round(average * 10) / 10;
}

export function resolveMostBlockedStep(
  groups: Array<{ name: string; _count: { _all: number } }>,
): { stepCode: string | null; count: number } {
  const topGroup = groups[0];

  if (!topGroup || topGroup._count._all === 0) {
    return { stepCode: null, count: 0 };
  }

  return {
    stepCode: topGroup.name,
    count: topGroup._count._all,
  };
}
