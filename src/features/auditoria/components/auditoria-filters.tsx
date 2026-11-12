import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { type UserResponse } from '@/features/users/types/users-api.types';
import {
  AUDIT_CATEGORY_FILTER_OPTIONS,
  AUDIT_PERIOD_PRESETS,
  getActivePeriodPreset,
  getPeriodPresetRange,
} from '@/features/auditoria/utils/auditoria-presentation';
import { type AuditoriaFiltersState } from '@/features/auditoria/utils/auditoria-search-params';

type AuditoriaFiltersProps = {
  filters: AuditoriaFiltersState;
  actors: UserResponse[];
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onFilterChange: (changes: Partial<AuditoriaFiltersState>) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
};

const labelClassName = 'text-xs font-medium text-neutral';

const chipClassName =
  'rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export function AuditoriaFilters({
  filters,
  actors,
  searchInput,
  onSearchInputChange,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: AuditoriaFiltersProps) {
  const activePreset = getActivePeriodPreset(
    filters.startDate,
    filters.endDate,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-64 space-y-1 text-sm">
          <span className={labelClassName}>Quem fez</span>
          <Select
            value={filters.actorId}
            onChange={(event) =>
              onFilterChange({ actorId: event.target.value, page: 1 })
            }
          >
            <option value="">Todos os colaboradores</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="min-w-[240px] flex-1 space-y-1 text-sm md:max-w-md">
          <span className={labelClassName}>Cliente ou contrato</span>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Buscar por nome do cliente ou contrato"
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
          </div>
        </label>

        <div className="space-y-1 text-sm">
          <span className={labelClassName}>Período</span>
          <div className="flex flex-wrap items-center gap-2">
            {AUDIT_PERIOD_PRESETS.map((preset) => {
              const active = activePreset === preset.value;

              return (
                <button
                  key={preset.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onFilterChange({
                      ...getPeriodPresetRange(preset.value),
                      page: 1,
                    })
                  }
                  className={cn(
                    chipClassName,
                    active
                      ? 'border-primary/50 bg-primary/15 text-foreground'
                      : 'border-border bg-card text-neutral hover:text-foreground',
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
            <Input
              type="date"
              aria-label="Período inicial"
              className="w-40"
              value={filters.startDate}
              onChange={(event) =>
                onFilterChange({ startDate: event.target.value, page: 1 })
              }
            />
            <span className="text-neutral" aria-hidden="true">
              até
            </span>
            <Input
              type="date"
              aria-label="Período final"
              className="w-40"
              value={filters.endDate}
              onChange={(event) =>
                onFilterChange({ endDate: event.target.value, page: 1 })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Tipo de ação"
          className="inline-flex flex-wrap rounded-lg border border-border bg-card p-0.5"
        >
          {AUDIT_CATEGORY_FILTER_OPTIONS.map((option) => {
            const active = filters.category === option.value;

            return (
              <button
                key={option.value || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onFilterChange({ category: option.value, page: 1 })
                }
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/15 text-foreground'
                    : 'text-neutral hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {hasActiveFilters ? (
          <Button variant="secondary" size="sm" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}
