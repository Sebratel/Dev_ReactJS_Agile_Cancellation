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
import { OverdueDateCountPicker } from '@/features/collection-cases/components/overdue-date-count-picker';
import { getContractStatusLabel } from '@/features/customers/utils/customer-labels';
import {
  supervisionFiltersToListParams,
  type SupervisionFiltersState,
} from '@/features/supervision/utils/supervision-search-params';

const STATUS_OPTIONS = [
  'WAITING_TRIAGE',
  'IN_COLLECTION',
  'AWAITING_PAYMENT',
  'NO_RESPONSE',
  'ELIGIBLE_FOR_CANCELLATION',
  'CANCELLATION_IN_PROGRESS',
  'RECOVERED',
  'PAYMENT_MADE',
  'CLOSED',
] as const;

const CONTRACT_STATUS_OPTIONS = ['ACTIVE', 'SUSPENDED'] as const;

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
    filters.status ||
    filters.priority ||
    filters.slaStatus ||
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
    filters.status,
    filters.priority,
    filters.slaStatus,
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

  // Params usados so pelo popover "casos por data" — reflete os demais
  // filtros ativos (inclusive a data do outro campo de vencimento), para que
  // a contagem exibida bata com o que o supervisor realmente veria na
  // tabela ao escolher aquela data.
  const overdueDateSummaryParams = supervisionFiltersToListParams(
    filters,
    filters.search,
  );

  const chips: ActiveFilterChip[] = [];

  if (filters.search.trim()) {
    chips.push({
      key: 'search',
      label: `Cliente: "${filters.search.trim()}"`,
      onRemove: () => {
        onSearchInputChange('');
      },
    });
  }

  if (filters.firstDueDate) {
    chips.push({
      key: 'firstDueDate',
      label: `1o vencimento: ${formatDateInputLabel(filters.firstDueDate)}`,
      onRemove: () => clearFilter({ firstDueDate: '' }),
    });
  }

  if (filters.secondDueDate) {
    chips.push({
      key: 'secondDueDate',
      label: `2o vencimento: ${formatDateInputLabel(filters.secondDueDate)}`,
      onRemove: () => clearFilter({ secondDueDate: '' }),
    });
  }

  if (filters.contractStatus) {
    chips.push({
      key: 'contractStatus',
      label: `Contrato: ${getContractStatusLabel(filters.contractStatus)}`,
      onRemove: () => clearFilter({ contractStatus: '' }),
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
      label:
        filters.interactionStatus === 'contacted'
          ? 'Já contatados'
          : 'Não contatados',
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

  return (
    <SectionCard
      title="Filtros"
      description="Busque pelo cliente, pela data exata de cada vencimento em aberto e pelo status do contrato. Os demais critérios ficam em 'Mais filtros'."
      contentClassName="space-y-3"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className={labelClassName}>Cliente</span>
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
          <span className={labelClassName}>1o vencimento</span>
          <div className="flex gap-1.5">
            <Input
              type="date"
              value={filters.firstDueDate}
              onChange={(event) =>
                onFilterChange({ firstDueDate: event.target.value, page: 1 })
              }
            />
            <OverdueDateCountPicker
              field="first"
              label="1o vencimento"
              listParams={overdueDateSummaryParams}
              selectedDate={filters.firstDueDate}
              onSelectDate={(date) =>
                onFilterChange({ firstDueDate: date, page: 1 })
              }
            />
          </div>
        </label>

        <label className="space-y-1 text-sm">
          <span className={labelClassName}>2o vencimento</span>
          <div className="flex gap-1.5">
            <Input
              type="date"
              value={filters.secondDueDate}
              onChange={(event) =>
                onFilterChange({ secondDueDate: event.target.value, page: 1 })
              }
            />
            <OverdueDateCountPicker
              field="second"
              label="2o vencimento"
              listParams={overdueDateSummaryParams}
              selectedDate={filters.secondDueDate}
              onSelectDate={(date) =>
                onFilterChange({ secondDueDate: date, page: 1 })
              }
            />
          </div>
        </label>

        <label className="space-y-1 text-sm">
          <span className={labelClassName}>Status do contrato</span>
          <Select
            value={filters.contractStatus}
            onChange={(event) =>
              onFilterChange({ contractStatus: event.target.value, page: 1 })
            }
          >
            <option value="">Todos os contratos</option>
            {CONTRACT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getContractStatusLabel(status)}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {advancedOpen ? (
        <div className="grid gap-3 border-t border-border pt-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className={labelClassName}>Status do caso</span>
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
              <option value="contacted">Já contatados</option>
              <option value="not_contacted">Não contatados</option>
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
