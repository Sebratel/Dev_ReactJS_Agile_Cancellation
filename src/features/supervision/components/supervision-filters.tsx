import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useState } from 'react';
import { SectionCard } from '@/components/data-display/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  getCollectionStatusLabel,
  getPriorityLabel,
} from '@/features/collection-cases/utils/collection-case-labels';
import { type SupervisionFiltersState } from '@/features/supervision/utils/supervision-search-params';

const STATUS_OPTIONS = [
  'WAITING_TRIAGE',
  'IN_COLLECTION',
  'AWAITING_PAYMENT',
  'NO_RESPONSE',
  'ELIGIBLE_FOR_CANCELLATION',
  'CANCELLATION_IN_PROGRESS',
  'CLOSED',
] as const;

const PROMISE_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Promessa ativa' },
  { value: 'FULFILLED', label: 'Promessa cumprida' },
  { value: 'BROKEN', label: 'Promessa quebrada' },
] as const;

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const SLA_STATUS_OPTIONS = [
  { value: 'overdue', label: 'SLA vencido' },
  { value: 'due_today', label: 'SLA vence hoje' },
  { value: 'ok', label: 'Dentro do SLA' },
  { value: 'no_sla', label: 'Sem SLA' },
] as const;

const SLA_LABELS: Record<string, string> = Object.fromEntries(
  SLA_STATUS_OPTIONS.map((option) => [option.value, option.label]),
);

const PROMISE_LABELS: Record<string, string> = Object.fromEntries(
  PROMISE_STATUS_OPTIONS.map((option) => [option.value, option.label]),
);

type SupervisionFiltersProps = {
  filters: SupervisionFiltersState;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onFilterChange: (changes: Partial<SupervisionFiltersState>) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
};

const labelClassName = 'text-xs font-medium text-neutral';

type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

function hasAdvancedFilters(filters: SupervisionFiltersState): boolean {
  return Boolean(
    filters.createdToday ||
    filters.interactionStatus ||
    filters.promiseStatus ||
    filters.daysOverdueMin ||
    filters.daysOverdueMax ||
    filters.totalOutstandingMin ||
    filters.totalOutstandingMax,
  );
}

function formatDateInputLabel(value: string) {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function SupervisionFilters({
  filters,
  searchInput,
  onSearchInputChange,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: SupervisionFiltersProps) {
  const advancedCount = [
    filters.createdToday,
    filters.interactionStatus,
    filters.promiseStatus,
    filters.daysOverdueMin,
    filters.daysOverdueMax,
    filters.totalOutstandingMin,
    filters.totalOutstandingMax,
  ].filter(Boolean).length;

  const [advancedOpen, setAdvancedOpen] = useState(() =>
    hasAdvancedFilters(filters),
  );

  const clearFilter = (changes: Partial<SupervisionFiltersState>) => {
    onFilterChange({ ...changes, page: 1 });
  };

  const chips: ActiveFilterChip[] = [];

  if (filters.search.trim()) {
    chips.push({
      key: 'search',
      label: `Busca: "${filters.search.trim()}"`,
      onRemove: () => {
        onSearchInputChange('');
      },
    });
  }

  if (filters.status) {
    chips.push({
      key: 'status',
      label: `Status: ${getCollectionStatusLabel(filters.status)}`,
      onRemove: () => clearFilter({ status: '' }),
    });
  }

  if (filters.priority) {
    chips.push({
      key: 'priority',
      label: `Prioridade: ${getPriorityLabel(filters.priority)}`,
      onRemove: () => clearFilter({ priority: '' }),
    });
  }

  if (filters.slaStatus) {
    chips.push({
      key: 'slaStatus',
      label: SLA_LABELS[filters.slaStatus] ?? filters.slaStatus,
      onRemove: () => clearFilter({ slaStatus: '' }),
    });
  }

  if (filters.createdToday) {
    chips.push({
      key: 'createdToday',
      label: 'Criados hoje',
      onRemove: () => clearFilter({ createdToday: '' }),
    });
  }

  if (filters.interactionStatus) {
    chips.push({
      key: 'interactionStatus',
      label: 'Sem tentativa de contato',
      onRemove: () => clearFilter({ interactionStatus: '' }),
    });
  }

  if (filters.promiseStatus) {
    chips.push({
      key: 'promiseStatus',
      label: PROMISE_LABELS[filters.promiseStatus] ?? filters.promiseStatus,
      onRemove: () => clearFilter({ promiseStatus: '' }),
    });
  }

  if (filters.daysOverdueMin) {
    chips.push({
      key: 'daysOverdueMin',
      label: `Atraso >= ${filters.daysOverdueMin} dias`,
      onRemove: () => clearFilter({ daysOverdueMin: '' }),
    });
  }

  if (filters.daysOverdueMax) {
    chips.push({
      key: 'daysOverdueMax',
      label: `Atraso <= ${filters.daysOverdueMax} dias`,
      onRemove: () => clearFilter({ daysOverdueMax: '' }),
    });
  }

  if (filters.totalOutstandingMin) {
    chips.push({
      key: 'totalOutstandingMin',
      label: `Valor >= ${filters.totalOutstandingMin}`,
      onRemove: () => clearFilter({ totalOutstandingMin: '' }),
    });
  }

  if (filters.totalOutstandingMax) {
    chips.push({
      key: 'totalOutstandingMax',
      label: `Valor <= ${filters.totalOutstandingMax}`,
      onRemove: () => clearFilter({ totalOutstandingMax: '' }),
    });
  }

  if (filters.dueDateStart) {
    chips.push({
      key: 'dueDateStart',
      label: `Vencimento >= ${formatDateInputLabel(filters.dueDateStart)}`,
      onRemove: () => clearFilter({ dueDateStart: '' }),
    });
  }

  if (filters.dueDateEnd) {
    chips.push({
      key: 'dueDateEnd',
      label: `Vencimento <= ${formatDateInputLabel(filters.dueDateEnd)}`,
      onRemove: () => clearFilter({ dueDateEnd: '' }),
    });
  }

  return (
    <SectionCard
      title="Filtros"
      description="Refine a carteira por busca, vencimento, status, prioridade e SLA."
      contentClassName="space-y-3"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <label className="space-y-1 text-sm">
          <span className={labelClassName}>Busca</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-neutral" />
            <Input
              className="pl-9"
              placeholder="Cliente, documento ou contrato"
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
          </div>
        </label>

        <label className="space-y-1 text-sm">
          <span className={labelClassName}>Status</span>
          <Select
            value={filters.status}
            onChange={(event) =>
              onFilterChange({ status: event.target.value, page: 1 })
            }
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getCollectionStatusLabel(status)}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1 text-sm">
          <span className={labelClassName}>Prioridade</span>
          <Select
            value={filters.priority}
            onChange={(event) =>
              onFilterChange({ priority: event.target.value, page: 1 })
            }
          >
            <option value="">Todas as prioridades</option>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {getPriorityLabel(priority)}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1 text-sm">
          <span className={labelClassName}>Vencimento inicial</span>
          <Input
            type="date"
            value={filters.dueDateStart}
            onChange={(event) =>
              onFilterChange({ dueDateStart: event.target.value, page: 1 })
            }
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className={labelClassName}>Vencimento final</span>
          <Input
            type="date"
            value={filters.dueDateEnd}
            onChange={(event) =>
              onFilterChange({ dueDateEnd: event.target.value, page: 1 })
            }
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className={labelClassName}>SLA</span>
          <Select
            value={filters.slaStatus}
            onChange={(event) =>
              onFilterChange({ slaStatus: event.target.value, page: 1 })
            }
          >
            <option value="">Todos os SLAs</option>
            {SLA_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {advancedOpen ? (
        <div className="grid gap-3 border-t border-border pt-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className={labelClassName}>Criados hoje</span>
            <Select
              value={filters.createdToday}
              onChange={(event) =>
                onFilterChange({ createdToday: event.target.value, page: 1 })
              }
            >
              <option value="">Qualquer data</option>
              <option value="true">Somente hoje</option>
            </Select>
          </label>

          <label className="space-y-1 text-sm">
            <span className={labelClassName}>Interação</span>
            <Select
              value={filters.interactionStatus}
              onChange={(event) =>
                onFilterChange({
                  interactionStatus: event.target.value,
                  page: 1,
                })
              }
            >
              <option value="">Qualquer interação</option>
              <option value="none">Sem tentativa de contato</option>
            </Select>
          </label>

          <label className="space-y-1 text-sm">
            <span className={labelClassName}>Promessa</span>
            <Select
              value={filters.promiseStatus}
              onChange={(event) =>
                onFilterChange({ promiseStatus: event.target.value, page: 1 })
              }
            >
              <option value="">Qualquer promessa</option>
              {PROMISE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1 text-sm">
            <span className={labelClassName}>Dias em atraso (min)</span>
            <Input
              inputMode="numeric"
              placeholder="Ex.: 30"
              value={filters.daysOverdueMin}
              onChange={(event) =>
                onFilterChange({ daysOverdueMin: event.target.value, page: 1 })
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className={labelClassName}>Dias em atraso (max)</span>
            <Input
              inputMode="numeric"
              placeholder="Ex.: 120"
              value={filters.daysOverdueMax}
              onChange={(event) =>
                onFilterChange({ daysOverdueMax: event.target.value, page: 1 })
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className={labelClassName}>Valor em aberto (min)</span>
            <Input
              inputMode="decimal"
              placeholder="Ex.: 1000"
              value={filters.totalOutstandingMin}
              onChange={(event) =>
                onFilterChange({
                  totalOutstandingMin: event.target.value,
                  page: 1,
                })
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className={labelClassName}>Valor em aberto (max)</span>
            <Input
              inputMode="decimal"
              placeholder="Ex.: 20000"
              value={filters.totalOutstandingMax}
              onChange={(event) =>
                onFilterChange({
                  totalOutstandingMax: event.target.value,
                  page: 1,
                })
              }
            />
          </label>

        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs font-medium text-neutral">
            Filtros ativos:
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              aria-label={`Remover filtro ${chip.label}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors duration-150 hover:border-neutral/40 hover:bg-muted/70"
            >
              {chip.label}
              <X className="h-3 w-3 text-neutral" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
        >
          {advancedOpen ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
          Mais filtros
          {advancedCount > 0 ? (
            <span
              className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-semibold text-foreground',
              )}
            >
              {advancedCount}
            </span>
          ) : null}
        </Button>
        {hasActiveFilters ? (
          <Button variant="secondary" size="sm" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}
