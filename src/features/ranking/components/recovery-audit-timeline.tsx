import {
  Check,
  CircleCheck,
  CircleHelp,
  CircleX,
  CreditCard,
  Flag,
  MessageCircle,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { type RecoveryAuditCase } from '@/features/ranking/types/ranking-api.types';
import {
  buildTimelineSteps,
  type TimelinePill,
  type TimelineStep,
  type TimelineStepKind,
} from '@/features/ranking/utils/recovery-audit-timeline';

const STEP_ICONS: Record<TimelineStepKind, LucideIcon> = {
  contact: MessageCircle,
  payment: CreditCard,
  reactivation: RotateCcw,
  recovery: Flag,
  result: CircleCheck,
};

const DOT_CLASSES: Record<TimelineStepKind, string> = {
  contact: 'border-primary/50 bg-primary/10 text-foreground',
  payment: 'border-warning/50 bg-warning/15 text-warning',
  reactivation: 'border-warning/50 bg-warning/15 text-warning',
  recovery: 'border-border bg-muted text-neutral',
  result: 'border-success/50 bg-success/10 text-success',
};

const PILL_STYLES = {
  ok: { icon: Check, className: 'bg-success/10 text-success' },
  fail: { icon: CircleX, className: 'bg-danger/10 text-danger' },
  unknown: { icon: CircleHelp, className: 'bg-warning/15 text-warning' },
} as const;

function Pill({ pill }: { pill: TimelinePill }) {
  const style = PILL_STYLES[pill.status];
  const Icon = style.icon;

  return (
    <div className="text-left">
      <span
        className={cn(
          'inline-flex items-start gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight',
          style.className,
        )}
      >
        <Icon className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
        {pill.label}
      </span>
      {pill.detail ? (
        <p className="mt-0.5 text-[11px] leading-snug text-neutral">
          {pill.detail}
        </p>
      ) : null}
    </div>
  );
}

function Step({ step }: { step: TimelineStep }) {
  const Icon = STEP_ICONS[step.kind];

  return (
    <li
      // O traço que liga ao passo anterior só existe na horizontal (md+).
      className="relative flex gap-3 md:block md:px-1.5 md:text-center md:before:absolute md:before:left-[-50%] md:before:top-[13px] md:before:h-px md:before:w-full md:before:bg-border md:first:before:hidden"
    >
      <span
        className={cn(
          'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border md:mx-auto',
          step.problem
            ? 'border-danger/50 bg-danger/10 text-danger'
            : DOT_CLASSES[step.kind],
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1 space-y-1 md:mt-2">
        {step.when ? (
          <p className="text-[11px] text-neutral">{step.when}</p>
        ) : null}
        <p className="text-[13px] font-medium leading-snug">{step.title}</p>
        {step.subtitle ? (
          <p className="text-xs leading-snug text-neutral">{step.subtitle}</p>
        ) : null}
        {step.note ? (
          <p className="text-[11px] italic leading-snug text-neutral">
            “{step.note}”
          </p>
        ) : null}
        <div className="flex flex-col gap-1 md:items-center">
          {step.pills.map((pill) => (
            <Pill key={pill.label} pill={pill} />
          ))}
        </div>
      </div>
    </li>
  );
}

type RecoveryAuditTimelineProps = {
  item: RecoveryAuditCase;
};

// Linha do tempo horizontal (vertical em telas pequenas) de uma recuperação.
export function RecoveryAuditTimeline({ item }: RecoveryAuditTimelineProps) {
  const steps = buildTimelineSteps(item);

  return (
    <ol
      aria-label="Linha do tempo da recuperação"
      className="grid gap-4 md:gap-0 md:[grid-template-columns:repeat(var(--steps),minmax(0,1fr))]"
      style={{ '--steps': steps.length } as CSSProperties}
    >
      {steps.map((step) => (
        <Step key={step.key} step={step} />
      ))}
    </ol>
  );
}
