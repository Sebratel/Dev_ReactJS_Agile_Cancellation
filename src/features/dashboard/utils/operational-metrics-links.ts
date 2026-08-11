const SUPERVISION_BASE = '/supervisao';

export type OperationalMetricLinkKey =
  | 'activeCases'
  | 'newCasesToday'
  | 'casesWithoutInteraction'
  | 'overdueSlaCases'
  | 'activePromises'
  | 'brokenPromises'
  | 'inProgress'
  | 'completed'
  | 'outstandingAmount'
  | 'promisedAmount'
  | 'recoveredAmount'
  | 'cancelledAmount';

const OPERATIONAL_METRIC_LINKS: Record<OperationalMetricLinkKey, string> = {
  activeCases: SUPERVISION_BASE,
  newCasesToday: `${SUPERVISION_BASE}?createdToday=true`,
  casesWithoutInteraction: `${SUPERVISION_BASE}?interactionStatus=none`,
  overdueSlaCases: `${SUPERVISION_BASE}?slaStatus=overdue`,
  activePromises: `${SUPERVISION_BASE}?promiseStatus=ACTIVE`,
  brokenPromises: `${SUPERVISION_BASE}?promiseStatus=BROKEN`,
  inProgress: `${SUPERVISION_BASE}?status=CANCELLATION_IN_PROGRESS`,
  completed: `${SUPERVISION_BASE}?status=CLOSED`,
  outstandingAmount: SUPERVISION_BASE,
  promisedAmount: `${SUPERVISION_BASE}?promiseStatus=ACTIVE`,
  recoveredAmount: `${SUPERVISION_BASE}?promiseStatus=FULFILLED`,
  cancelledAmount: `${SUPERVISION_BASE}?status=CLOSED`,
};

export function getOperationalMetricHref(
  metricKey: string,
): string | undefined {
  return OPERATIONAL_METRIC_LINKS[metricKey as OperationalMetricLinkKey];
}

export function getOperationalMetricAriaLabel(
  metricKey: string,
  label: string,
): string | undefined {
  const href = getOperationalMetricHref(metricKey);

  if (!href) {
    return undefined;
  }

  return `Ver supervisão filtrada por ${label}`;
}
