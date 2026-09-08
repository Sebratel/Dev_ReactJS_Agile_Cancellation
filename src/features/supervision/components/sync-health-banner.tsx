import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useSyncHealth } from '@/features/integrations/hooks/use-integration-events';
import { cn } from '@/lib/utils';
import { formatDateTimePtBR, formatInteger } from '@/utils/formatters';

// Se o job de sync nao roda ha mais que isso, algo esta errado (ele roda a
// cada 30 min).
const SYNC_STALE_MS = 90 * 60 * 1000;

function relativeFromNow(iso: string | null): string {
  if (!iso) return 'nunca';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

export function SyncHealthBanner() {
  const query = useSyncHealth();

  if (query.isLoading || query.isError || !query.data) {
    return null;
  }

  const data = query.data;
  const syncStale =
    !data.lastErpSyncAt ||
    Date.now() - new Date(data.lastErpSyncAt).getTime() > SYNC_STALE_MS;
  const noRecentInflow = data.newCasesLast7d === 0;

  // Tom do banner: vermelho se o job parou; ambar se ha 7 dias sem entrada
  // (janela perdida ou feed do ERP realmente parado); neutro caso contrario.
  const tone = syncStale ? 'danger' : noRecentInflow ? 'warning' : 'ok';

  const Icon = tone === 'ok' ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border px-4 py-2.5 text-sm',
        tone === 'danger' && 'border-danger/40 bg-danger/5',
        tone === 'warning' && 'border-warning/40 bg-warning/5',
        tone === 'ok' && 'border-border bg-card',
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            tone === 'danger' && 'text-danger',
            tone === 'warning' && 'text-warning',
            tone === 'ok' && 'text-success',
          )}
          aria-hidden="true"
        />
        {syncStale ? (
          <span className="text-danger">Sincronização parada</span>
        ) : (
          <span>Sincronização ativa</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-neutral">
        <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Última sincronização{' '}
          <span className="font-medium text-foreground">
            {relativeFromNow(data.lastErpSyncAt)}
          </span>
        </span>
      </div>

      <div className="text-neutral">
        Casos novos (7d):{' '}
        <span
          className={cn(
            'font-semibold tabular-nums',
            noRecentInflow ? 'text-warning' : 'text-foreground',
          )}
        >
          {formatInteger(data.newCasesLast7d)}
        </span>
        {data.newCasesLast24h > 0 ? (
          <span className="text-neutral">
            {' '}
            · {formatInteger(data.newCasesLast24h)} nas últimas 24h
          </span>
        ) : null}
      </div>

      <div className="text-neutral">
        Última entrada:{' '}
        <span className="font-medium text-foreground">
          {data.lastNewCaseAt
            ? formatDateTimePtBR(data.lastNewCaseAt)
            : 'sem registro'}
        </span>
      </div>

      {noRecentInflow ? (
        <span className="text-xs text-warning">
          Sem entrada de casos há 7 dias — verifique o feed do ERP.
        </span>
      ) : null}
    </div>
  );
}
