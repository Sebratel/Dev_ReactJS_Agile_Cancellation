import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { SectionCard } from '@/components/data-display/section-card';
import { PageHeader } from '@/components/data-display/page-header';
import { PageContainer } from '@/components/navigation/page-container';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import { BulkContactWhatsAppByFilterAction } from '@/features/collection-cases/components/bulk-contact-whatsapp-by-filter-action';
import { BulkContactWhatsAppJobsHistory } from '@/features/collection-cases/components/bulk-contact-whatsapp-jobs-history';
import { SupervisionFilters } from '@/features/supervision/components/supervision-filters';
import {
  EMPTY_SUPERVISION_FILTERS,
  hasActiveSupervisionFilters,
  supervisionFiltersToListParams,
  type SupervisionFiltersState,
} from '@/features/supervision/utils/supervision-search-params';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export default function WhatsappBulkContactPage() {
  const [filters, setFilters] = useState<SupervisionFiltersState>(
    EMPTY_SUPERVISION_FILTERS,
  );
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [historyPage, setHistoryPage] = useState(1);

  const updateFilters = (changes: Partial<SupervisionFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...changes, page: 1 }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters(EMPTY_SUPERVISION_FILTERS);
  };

  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  // So precisamos do total do grupo aqui, nao da lista em si — limit baixo
  // para nao trazer dados que a tela nao usa.
  const listParams = useMemo(
    () => ({
      ...supervisionFiltersToListParams(filters, debouncedSearch),
      page: 1,
      limit: 1,
    }),
    [filters, debouncedSearch],
  );

  const matchQuery = useCollectionCases(listParams);
  const matchCount = matchQuery.data?.pagination.total ?? 0;

  const filterParamsForJob = useMemo(
    () => supervisionFiltersToListParams(filters, debouncedSearch),
    [filters, debouncedSearch],
  );

  const hasActiveFilters = hasActiveSupervisionFilters({
    ...filters,
    search: debouncedSearch,
  });

  return (
    <PageContainer>
      <PageHeader
        title="Envio de HSM em massa"
        description="Filtre o grupo de clientes desejado e dispare a mensagem HSM do WhatsApp para todos eles de uma vez, sem precisar marcar caso a caso."
      />

      <SupervisionFilters
        filters={filters}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onFilterChange={updateFilters}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <SectionCard
        title="Grupo selecionado"
        description="O envio considera exatamente os filtros aplicados acima."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 rounded-lg border border-primary/25 bg-primary/10 px-5 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral">
                Clientes selecionados
              </p>
              {matchQuery.isLoading ? (
                <p className="mt-0.5 text-sm text-neutral">Calculando...</p>
              ) : (
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                  {matchCount}
                </p>
              )}
            </div>
          </div>

          <BulkContactWhatsAppByFilterAction
            filters={filterParamsForJob}
            matchCount={matchCount}
            onFinished={() => setHistoryPage(1)}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Histórico de envios"
        description="Envios em lote mais recentes, com o progresso agregado de cada um."
      >
        <BulkContactWhatsAppJobsHistory
          page={historyPage}
          onPageChange={setHistoryPage}
        />
      </SectionCard>
    </PageContainer>
  );
}
