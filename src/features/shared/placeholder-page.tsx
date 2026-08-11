import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { PageContainer } from '@/components/navigation/page-container';

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <PageContainer>
      <PageHeader title={title} description={description} />
      <SectionCard
        title="Módulo em preparação"
        description="Esta área faz parte da fundação inicial do frontend."
      >
        <p className="text-sm leading-6 text-neutral">
          O layout, a navegação e os componentes base já estão prontos para
          receber as regras de negócio nas próximas etapas.
        </p>
      </SectionCard>
    </PageContainer>
  );
}
