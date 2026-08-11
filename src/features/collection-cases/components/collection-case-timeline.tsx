import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FilePlus,
  HandshakeIcon,
  MinusCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { SectionCard } from '@/components/data-display/section-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TimelineSkeleton } from '@/components/feedback/timeline-skeleton';
import { useCollectionCaseTimeline } from '@/features/collection-cases/hooks/use-collection-case-timeline';
import { type CollectionCaseTimelineEvent } from '@/features/collection-cases/types/collection-cases-api.types';
import { cn } from '@/lib/utils';
import { formatDatePtBR, formatDateTimePtBR } from '@/utils/formatters';

type CollectionCaseTimelineProps = {
  caseId: string;
};

type TimelineGroup = {
  dateLabel: string;
  events: CollectionCaseTimelineEvent[];
};

type EventStyle = {
  icon: React.ElementType;
  dotClass: string;
  iconClass: string;
  borderClass: string;
  labelClass: string;
  label: string;
};

const EVENT_STYLES: Record<string, EventStyle> = {
  CASE_CREATED: {
    icon: FilePlus,
    dotClass: 'bg-primary/10 ring-primary/20',
    iconClass: 'text-primary',
    borderClass: 'border-l-primary/30',
    labelClass: 'text-primary',
    label: 'Caso criado',
  },
  ATTEMPT_CREATED: {
    icon: Phone,
    dotClass: 'bg-blue-500/10 ring-blue-500/20',
    iconClass: 'text-blue-500',
    borderClass: 'border-l-blue-500/30',
    labelClass: 'text-blue-600 dark:text-blue-400',
    label: 'Tentativa de contato',
  },
  PAYMENT_PROMISE_CREATED: {
    icon: HandshakeIcon,
    dotClass: 'bg-amber-500/10 ring-amber-500/20',
    iconClass: 'text-amber-500',
    borderClass: 'border-l-amber-500/30',
    labelClass: 'text-amber-600 dark:text-amber-400',
    label: 'Promessa registrada',
  },
  PAYMENT_PROMISE_FULFILLED: {
    icon: CheckCircle2,
    dotClass: 'bg-success/10 ring-success/20',
    iconClass: 'text-success',
    borderClass: 'border-l-success/30',
    labelClass: 'text-success',
    label: 'Promessa cumprida',
  },
  PAYMENT_PROMISE_BROKEN: {
    icon: XCircle,
    dotClass: 'bg-danger/10 ring-danger/20',
    iconClass: 'text-danger',
    borderClass: 'border-l-danger/30',
    labelClass: 'text-danger',
    label: 'Promessa descumprida',
  },
  PAYMENT_PROMISE_CANCELLED: {
    icon: MinusCircle,
    dotClass: 'bg-muted ring-border',
    iconClass: 'text-neutral',
    borderClass: 'border-l-border',
    labelClass: 'text-neutral',
    label: 'Promessa cancelada',
  },
  CASE_SENT_TO_CANCELLATION: {
    icon: AlertTriangle,
    dotClass: 'bg-warning/10 ring-warning/20',
    iconClass: 'text-warning',
    borderClass: 'border-l-warning/30',
    labelClass: 'text-warning',
    label: 'Enviado para cancelamento',
  },
  CASE_REVERTED_FROM_CANCELLATION: {
    icon: RotateCcw,
    dotClass: 'bg-success/10 ring-success/20',
    iconClass: 'text-success',
    borderClass: 'border-l-success/30',
    labelClass: 'text-success',
    label: 'Cancelamento revertido',
  },
  CANCELLATION_STEP_COMPLETED: {
    icon: CheckCircle2,
    dotClass: 'bg-success/10 ring-success/20',
    iconClass: 'text-success',
    borderClass: 'border-l-success/30',
    labelClass: 'text-success',
    label: 'Etapa concluída',
  },
  CANCELLATION_PROCESS_COMPLETED: {
    icon: ShieldCheck,
    dotClass: 'bg-success/10 ring-success/20',
    iconClass: 'text-success',
    borderClass: 'border-l-success/30',
    labelClass: 'text-success',
    label: 'Cancelamento concluído',
  },
  AUDIT_EVENT: {
    icon: ClipboardList,
    dotClass: 'bg-muted ring-border',
    iconClass: 'text-neutral',
    borderClass: 'border-l-border',
    labelClass: 'text-neutral',
    label: 'Auditoria',
  },
};

const DEFAULT_STYLE: EventStyle = {
  icon: ClipboardList,
  dotClass: 'bg-muted ring-border',
  iconClass: 'text-neutral',
  borderClass: 'border-l-border',
  labelClass: 'text-neutral',
  label: 'Evento',
};

function getEventStyle(type: string): EventStyle {
  return EVENT_STYLES[type] ?? DEFAULT_STYLE;
}

function groupEventsByDate(
  events: CollectionCaseTimelineEvent[],
): TimelineGroup[] {
  const groups: TimelineGroup[] = [];

  for (const event of events) {
    const dateLabel = formatDatePtBR(event.occurredAt);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.dateLabel === dateLabel) {
      lastGroup.events.push(event);
    } else {
      groups.push({ dateLabel, events: [event] });
    }
  }

  return groups;
}

export function CollectionCaseTimeline({
  caseId,
}: CollectionCaseTimelineProps) {
  const timelineQuery = useCollectionCaseTimeline(caseId);

  const handleRetry = () => {
    void timelineQuery.refetch();
  };

  return (
    <SectionCard
      title="Timeline do caso"
      description="Histórico cronológico de tentativas, promessas e auditoria."
    >
      {timelineQuery.isLoading ? <TimelineSkeleton items={3} /> : null}

      {timelineQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar a timeline"
          description="Verifique se o backend está disponível e tente novamente."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!timelineQuery.isLoading &&
      !timelineQuery.isError &&
      timelineQuery.data &&
      timelineQuery.data.events.length === 0 ? (
        <EmptyState
          title="Nenhum evento registrado"
          description="A timeline será atualizada conforme tentativas, promessas e auditorias forem registradas."
        />
      ) : null}

      {!timelineQuery.isLoading &&
      !timelineQuery.isError &&
      timelineQuery.data &&
      timelineQuery.data.events.length > 0 ? (
        <div className="space-y-8">
          {groupEventsByDate(timelineQuery.data.events).map((group, groupIdx) => (
            <section key={group.dateLabel} aria-label={group.dateLabel}>
              {/* Date separator */}
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="rounded-full border border-border bg-muted px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral">
                  {group.dateLabel}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Events list */}
              <ol className="relative space-y-3 pl-10">
                {/* Vertical line */}
                <span
                  className={cn(
                    'absolute left-[15px] top-5 w-px bg-border',
                    groupIdx === 0 ? 'top-5' : '-top-4',
                  )}
                  style={{
                    bottom: group.events.length > 1 ? '1.5rem' : '50%',
                  }}
                  aria-hidden
                />

                {group.events.map((event) => {
                  const style = getEventStyle(event.type);
                  const Icon = style.icon;

                  return (
                    <li key={event.id} className="relative">
                      {/* Dot with icon */}
                      <span
                        className={cn(
                          'absolute -left-10 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-card',
                          style.dotClass,
                        )}
                        aria-hidden
                      >
                        <Icon className={cn('h-4 w-4', style.iconClass)} />
                      </span>

                      {/* Card */}
                      <div
                        className={cn(
                          'rounded-xl border border-l-[3px] bg-card px-4 py-3 transition-colors duration-150 hover:bg-muted/30',
                          style.borderClass,
                        )}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'text-[11px] font-semibold uppercase tracking-[0.1em]',
                                  style.labelClass,
                                )}
                              >
                                {style.label}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground">
                              {event.title}
                            </p>
                            {event.description ? (
                              <p className="text-sm leading-relaxed text-neutral">
                                {event.description}
                              </p>
                            ) : null}
                            {event.actorName ? (
                              <p className="text-xs text-neutral/70">
                                Por: {event.actorName}
                              </p>
                            ) : null}
                          </div>
                          <time
                            className="shrink-0 text-xs font-medium tabular-nums text-neutral"
                            dateTime={event.occurredAt}
                          >
                            {formatDateTimePtBR(event.occurredAt)}
                          </time>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      ) : null}
    </SectionCard>
  );
}
