export function getOperationalAlertSupervisionHref(
  alertKey: string,
): string | undefined {
  switch (alertKey) {
    case 'slaBreached':
      return '/supervisao?slaStatus=overdue';
    case 'awaitingProtocol':
      return '/supervisao?status=CANCELLATION_IN_PROGRESS';
    case 'overduePromises':
      return '/supervisao?promiseStatus=BROKEN';
    case 'noContactAttempt':
      return '/supervisao?interactionStatus=none';
    case 'promisesDueToday':
      return '/promessas?status=ACTIVE';
    case 'inactiveAgents':
      return '/usuarios';
    default:
      return undefined;
  }
}
