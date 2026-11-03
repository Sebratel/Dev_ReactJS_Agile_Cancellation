import { SectionCard } from '@/components/data-display/section-card';
import { cn } from '@/lib/utils';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { useUpdateSettings } from '@/features/settings/hooks/use-update-settings';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

export function CancellationPermissionsCard() {
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();

  const enabled = settingsQuery.data?.allowAgentSendToCancellation ?? false;
  const isBusy = settingsQuery.isLoading || updateSettings.isPending;

  const handleToggle = async () => {
    const next = !enabled;

    try {
      await updateSettings.mutateAsync({ allowAgentSendToCancellation: next });
      toast.success(
        next
          ? 'Atendentes liberados para encaminhar ao cancelamento.'
          : 'Envio ao cancelamento restrito a supervisão e administração.',
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Não foi possível atualizar a permissão.';
      toast.error(message);
    }
  };

  return (
    <SectionCard
      title="Permissões de cancelamento"
      description="Defina quem pode encaminhar casos para a área de cancelamento."
    >
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            Permitir que atendentes enviem casos ao cancelamento
          </p>
          <p className="mt-1 text-xs text-neutral">
            Quando desligado, apenas supervisão e administração podem
            encaminhar. Supervisores e administradores sempre podem,
            independente desta chave.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Permitir que atendentes enviem casos ao cancelamento"
          disabled={isBusy}
          onClick={() => {
            void handleToggle();
          }}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            enabled ? 'bg-primary' : 'bg-border',
            isBusy && 'cursor-not-allowed opacity-60',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>
    </SectionCard>
  );
}
