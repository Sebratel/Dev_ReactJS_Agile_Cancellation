import { useState } from 'react';
import { BadgeCheck, ChevronDown, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

// Nota explicativa (recolhivel) para a supervisao entender de onde vem as
// notificacoes de "cliente regularizado" — quando disparam e para quem.
export function RecoveryNotificationsInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
      >
        <BadgeCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        <span className="text-sm font-medium">
          Sobre as notificações de regularização
        </span>
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 shrink-0 text-neutral transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border px-4 py-3 text-sm leading-relaxed text-neutral">
          <p>
            Quando um cliente da esteira <strong>quita o débito</strong> —
            confirmado automaticamente pelo ERP, a cada ~30 minutos — a
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
      ) : null}
    </div>
  );
}
