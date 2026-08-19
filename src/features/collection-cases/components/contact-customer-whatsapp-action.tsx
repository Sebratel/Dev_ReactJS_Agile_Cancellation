import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { MessageCircle, PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useContactCustomerWhatsApp } from '@/features/collection-cases/hooks/use-contact-customer-whatsapp';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

type ContactCustomerWhatsAppActionProps = {
  caseId: string;
  customerName: string;
  customerPhone: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Nao foi possivel enviar a mensagem para o cliente.';
}

export function ContactCustomerWhatsAppAction({
  caseId,
  customerName,
  customerPhone,
}: ContactCustomerWhatsAppActionProps) {
  const mutation = useContactCustomerWhatsApp(caseId);
  const [open, setOpen] = useState(false);
  const disabled = mutation.isPending || !customerPhone;

  async function handleContact() {
    try {
      const result = await mutation.mutateAsync();
      setOpen(false);
      toast.success(
        result.codAtendimento
          ? `Mensagem enviada. Atendimento Matrix ${result.codAtendimento} salvo.`
          : 'Mensagem enviada para o cliente.',
      );
    } catch (error) {
      // Mantem o dialog aberto para o usuario ver o erro e decidir tentar de novo
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 px-0 text-primary hover:bg-primary/10"
          disabled={disabled}
          title={
            customerPhone
              ? `Enviar WhatsApp para ${customerName}`
              : 'Cliente sem telefone cadastrado'
          }
          aria-label={
            customerPhone
              ? `Enviar WhatsApp para ${customerName}`
              : `Cliente ${customerName} sem telefone cadastrado`
          }
        >
          <PhoneCall className="h-4 w-4" aria-hidden="true" />
        </Button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </div>

          <AlertDialog.Title className="mt-3 text-lg font-semibold">
            Enviar mensagem no WhatsApp?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-neutral">
            Isso dispara a mensagem HSM para <strong>{customerName}</strong>{' '}
            agora mesmo. Confirme para continuar.
          </AlertDialog.Description>

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={mutation.isPending}>
                Cancelar
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                void handleContact();
              }}
            >
              {mutation.isPending ? 'Enviando...' : 'Enviar mensagem'}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
