import { PhoneCall } from 'lucide-react';
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
  const disabled = mutation.isPending || !customerPhone;

  async function handleContact() {
    try {
      await mutation.mutateAsync();
      toast.success('Mensagem enviada para o cliente.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
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
      onClick={() => {
        void handleContact();
      }}
    >
      <PhoneCall className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
