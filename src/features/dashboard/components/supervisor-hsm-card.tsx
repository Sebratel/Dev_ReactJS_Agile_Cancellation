import { Link, useNavigate } from 'react-router-dom';
import { SectionCard } from '@/components/data-display/section-card';
import { HsmDeliverySummary } from '@/features/supervision/components/hsm-delivery-summary';

// Entrega dos HSMs enviados (últimos 14 dias), com atalho para os casos de
// cada estado na Supervisão.
export function SupervisorHsmCard() {
  const navigate = useNavigate();

  return (
    <SectionCard
      title="Entrega dos HSMs"
      description="Mensagens de WhatsApp enviadas nos últimos 14 dias"
      contentClassName="p-4"
    >
      <HsmDeliverySummary
        baseParams={{}}
        activeState=""
        onSelectState={(state) => {
          void navigate(
            state ? `/supervisao?hsmDeliveryState=${state}` : '/supervisao',
          );
        }}
      />

      <div className="mt-4 text-xs">
        <Link
          to="/supervisao?hsmDeliveryState=FAILED"
          className="font-medium text-primary hover:underline"
        >
          Ver casos com falha →
        </Link>
      </div>
    </SectionCard>
  );
}
