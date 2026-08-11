import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { PageContainer } from '@/components/navigation/page-container';
import { SectionCard } from '@/components/data-display/section-card';

export function RouteFallback() {
  return (
    <PageContainer>
      <SectionCard
        title="Carregando módulo"
        description="Preparando os dados e a interface da rota selecionada."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`metric-${index}`} className="h-32 w-full" />
            ))}
          </div>
          <TableSkeleton rows={4} columns={4} />
        </div>
      </SectionCard>
    </PageContainer>
  );
}
