import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { PageContainer } from '@/components/navigation/page-container';
import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <PageHeader
        title="Acesso negado"
        description="O perfil autenticado não possui permissão para acessar este módulo."
      />
      <SectionCard title="Permissão insuficiente">
        <p className="text-sm leading-6 text-neutral">
          Revise o perfil autenticado ou retorne para uma área permitida da
          plataforma.
        </p>
        <div className="mt-4">
          <Button
            onClick={() => {
              void navigate('/dashboard');
            }}
          >
            Voltar ao dashboard
          </Button>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
