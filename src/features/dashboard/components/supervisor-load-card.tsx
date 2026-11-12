import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { SectionCard } from '@/components/data-display/section-card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { type CollectionCasePortfolioSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import { getAgentColor } from '@/features/supervision/utils/agent-colors';
import { formatInteger } from '@/utils/formatters';

type SupervisorLoadCardProps = {
  portfolios: CollectionCasePortfolioSummary[];
  isLoading: boolean;
};

// Mesmas cores e fotos da Supervisão; a barra de cada pessoa é proporcional à
// maior carga.
export function SupervisorLoadCard({
  portfolios,
  isLoading,
}: SupervisorLoadCardProps) {
  const rows = portfolios
    .filter((portfolio) => portfolio.totalActive > 0)
    .sort((left, right) => right.totalActive - left.totalActive);
  const total = rows.reduce((sum, row) => sum + row.totalActive, 0);
  const max = rows[0]?.totalActive ?? 0;

  return (
    <SectionCard
      title="Carga por atendente"
      description={
        total > 0 ? `${formatInteger(total)} casos ativos` : undefined
      }
      contentClassName="p-4"
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-6 animate-pulse rounded bg-muted/50"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral">
          Sem carteira ativa para exibir.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const agent = row.agent;
            const name = agent?.name ?? 'Sem responsável';
            const color = agent ? getAgentColor(agent.id) : null;

            return (
              <li
                key={agent?.id ?? '__unassigned__'}
                className="flex items-center gap-3"
              >
                {agent ? (
                  <UserAvatar
                    name={agent.name}
                    avatarUrl={agent.avatarUrl}
                    className="h-7 w-7 text-[10px]"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <span className="w-36 shrink-0 truncate text-sm" title={name}>
                  {name}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${max > 0 ? Math.max((row.totalActive / max) * 100, 2) : 0}%`,
                      backgroundColor: color ?? 'hsl(var(--warning))',
                    }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatInteger(row.totalActive)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 text-xs">
        <Link
          to="/supervisao"
          className="font-medium text-primary hover:underline"
        >
          Ver carteiras na Supervisão →
        </Link>
      </div>
    </SectionCard>
  );
}
