import { CheckCircle2, Cloud, ShieldAlert, Webhook } from 'lucide-react';
import { PageHeader } from '@/components/data-display/page-header';
import { PageContainer } from '@/components/navigation/page-container';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { useElevenIntegrationStatus } from '@/features/integrations/hooks/use-eleven-integration-status';
import { IntegrationEventsPanel } from '@/features/integrations/components/integration-events-panel';
import { useAuth } from '@/features/auth/auth-context';
import { hasAnyRole } from '@/features/auth/utils/role-utils';
import { CancellationPermissionsCard } from '@/features/settings/components/cancellation-permissions-card';

const SLA_THRESHOLDS = [
  { priority: 'Baixa', days: 15 },
  { priority: 'Média', days: 10 },
  { priority: 'Alta', days: 5 },
  { priority: 'Crítica', days: 2 },
];

export default function SettingsPage() {
  const elevenStatusQuery = useElevenIntegrationStatus();
  const elevenStatus = elevenStatusQuery.data;
  const { session } = useAuth();
  const isAdmin = hasAnyRole(session?.user.roles ?? [], ['ADMIN']);

  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        description="Ajustes gerais da plataforma, integrações e parâmetros institucionais."
      />

      {isAdmin ? <CancellationPermissionsCard /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Integração Eleven"
          description="Status da integração responsável pelos protocolos de cancelamento."
        >
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Cloud className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Modo: {elevenStatus?.mode ?? '—'}
                </p>
                <p className="text-xs text-neutral">
                  {elevenStatus?.message ?? 'Carregando status...'}
                </p>
              </div>
            </div>
            {elevenStatus ? (
              <StatusBadge
                label={elevenStatus.available ? 'Disponível' : 'Indisponível'}
                variant={elevenStatus.available ? 'success' : 'danger'}
              />
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Sincronização com ERP"
          description="Job agendado que importa contratos elegíveis para cobrança."
        >
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10">
                <Webhook className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium">Webhook n8n + ERP Sync</p>
                <p className="text-xs text-neutral">
                  Eventos de ingestão são monitorados no painel abaixo.
                </p>
              </div>
            </div>
            <StatusBadge label="Ativo" variant="success" />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Parâmetros de SLA"
        description="Prazo alvo de atendimento por prioridade (referência operacional, definido no motor de cálculo)."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SLA_THRESHOLDS.map((item) => (
            <div
              key={item.priority}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <span className="text-sm font-medium">{item.priority}</span>
              <span className="text-sm font-semibold tabular-nums text-primary">
                {item.days}d
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral">
          <ShieldAlert className="h-3.5 w-3.5" />
          Alterações de SLA requerem atualização no motor de priorização (ERP Sync).
        </p>
      </SectionCard>

      <div className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold">Monitoramento de integrações</h2>
          <p className="text-xs text-neutral">
            Acompanhe a saúde dos eventos recebidos via webhook e sincronização externa.
          </p>
        </div>
        <IntegrationEventsPanel />
      </div>

      <SectionCard
        title="Sobre a plataforma"
        description="Informações institucionais."
      >
        <div className="flex items-center gap-2 text-sm text-neutral">
          <CheckCircle2 className="h-4 w-4 text-success" />
          SEBRATEL - Gestão de Cobrança e Cancelamento
        </div>
      </SectionCard>
    </PageContainer>
  );
}
