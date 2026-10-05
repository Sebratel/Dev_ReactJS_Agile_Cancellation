import * as Dialog from '@radix-ui/react-dialog';
import { BadgeCheck, Info, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Nota explicativa (em popup) para a supervisao entender de onde vem as
// notificacoes de "cliente regularizado" — quando disparam e para quem. O
// gatilho fica no cabecalho; o conteudo e apenas informativo.
export function RecoveryNotificationsInfo() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary">
          <Info className="h-4 w-4" />
          Sobre as notificações
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              <BadgeCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold">
                Notificações de regularização
              </Dialog.Title>
              <Dialog.Description className="text-sm text-neutral">
                Quem é avisado quando um cliente regulariza, e por qual canal.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-neutral">
            <p>
              Quando um cliente da esteira <strong>quita o débito</strong> —
              confirmado automaticamente pelo ERP, a cada ~10 minutos — a
              plataforma avisa quem cuida dele, sem ninguém precisar acompanhar
              manualmente.
            </p>

            <ul className="space-y-2">
              <li className="flex gap-2">
                <Mail
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral"
                  aria-hidden="true"
                />
                <span>
                  <strong className="text-foreground">A supervisão</strong>{' '}
                  (você e os demais supervisores) recebe um{' '}
                  <strong className="text-foreground">resumo</strong> de todos os
                  clientes que se regularizaram na rodada — sino e e-mail.
                </span>
              </li>
              <li className="flex gap-2">
                <Mail
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral"
                  aria-hidden="true"
                />
                <span>
                  <strong className="text-foreground">
                    O atendente responsável
                  </strong>{' '}
                  recebe o aviso de cada cliente{' '}
                  <strong className="text-foreground">da carteira dele</strong>.
                  Casos sem responsável entram apenas no resumo da supervisão.
                </span>
              </li>
            </ul>

            <p className="text-xs text-neutral/80">
              O sino interno funciona sempre; o e-mail depende do fluxo de
              integração (N8N) estar ativo.
            </p>
          </div>

          <div className="mt-5 flex justify-end">
            <Dialog.Close asChild>
              <Button variant="secondary">Entendi</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
