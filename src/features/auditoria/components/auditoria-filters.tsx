import { Search } from 'lucide-react';
import { SectionCard } from '@/components/data-display/section-card';
import { Button } from '@/components/ui/button';
import {
  AUDIT_LOG_ACTION_OPTIONS,
  AUDIT_LOG_ENTITY_TYPE_OPTIONS,
} from '@/features/auditoria/types/auditoria-api.types';
import { type AuditoriaFiltersState } from '@/features/auditoria/utils/auditoria-search-params';

type AuditoriaFiltersProps = {
  filters: AuditoriaFiltersState;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onFilterChange: (changes: Partial<AuditoriaFiltersState>) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
};

const selectClassName =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary';

const inputClassName =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary';

const labelClassName = 'text-xs font-medium text-neutral';

export function AuditoriaFilters({
  filters,
  searchInput,
  onSearchInputChange,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: AuditoriaFiltersProps) {
  return (
    <SectionCard
      title="Filtros"
      description="Busca textual, usuário, entidade, ação e período."
      contentClassName="space-y-3"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5 text-sm md:col-span-2 xl:col-span-2">
          <span className={labelClassName}>Busca</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral" />
            <input
              className={`${inputClassName} pl-9`}
              placeholder="Entidade, ação, usuário..."
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
          </div>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className={labelClassName}>ID do ator</span>
          <input
            className={inputClassName}
            placeholder="ID do usuário"
            value={filters.actorId}
            onChange={(event) =>
              onFilterChange({ actorId: event.target.value, page: 1 })
            }
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className={labelClassName}>Entidade</span>
          <select
            className={selectClassName}
            value={filters.entityType}
            onChange={(event) =>
              onFilterChange({ entityType: event.target.value, page: 1 })
            }
          >
            <option value="">Todas as entidades</option>
            {AUDIT_LOG_ENTITY_TYPE_OPTIONS.map((entityType) => (
              <option key={entityType} value={entityType}>
                {entityType}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className={labelClassName}>ID da entidade</span>
          <input
            className={inputClassName}
            placeholder="ID da entidade"
            value={filters.entityId}
            onChange={(event) =>
              onFilterChange({ entityId: event.target.value, page: 1 })
            }
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className={labelClassName}>Ação</span>
          <select
            className={selectClassName}
            value={filters.action}
            onChange={(event) =>
              onFilterChange({ action: event.target.value, page: 1 })
            }
          >
            <option value="">Todas as ações</option>
            {AUDIT_LOG_ACTION_OPTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className={labelClassName}>Período inicial</span>
          <input
            type="date"
            className={inputClassName}
            value={filters.startDate}
            onChange={(event) =>
              onFilterChange({ startDate: event.target.value, page: 1 })
            }
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className={labelClassName}>Período final</span>
          <input
            type="date"
            className={inputClassName}
            value={filters.endDate}
            onChange={(event) =>
              onFilterChange({ endDate: event.target.value, page: 1 })
            }
          />
        </label>
      </div>

      {hasActiveFilters ? (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        </div>
      ) : null}
    </SectionCard>
  );
}
