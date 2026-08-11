import { Module } from '@nestjs/common';
import { CancellationsController } from '@/modules/cancellations/cancellations.controller';
import { CancellationsService } from '@/modules/cancellations/cancellations.service';
import { cancellationsRepositoryProvider } from '@/modules/cancellations/repositories/cancellations.repository.provider';
import { PerformedByResolverService } from '@/modules/collection-cases/services/performed-by-resolver.service';
import { CancellationStepPolicyService } from '@/modules/cancellations/policies/cancellation-step-policy.service';
import { ElevenIntegrationService } from '@/modules/integrations/eleven/eleven-integration.service';
import { ElevenModule } from '@/modules/integrations/eleven/eleven.module';

@Module({
  imports: [ElevenModule],
  controllers: [CancellationsController],
  providers: [
    CancellationsService,
    ElevenIntegrationService,
    CancellationStepPolicyService,
    PerformedByResolverService,
    cancellationsRepositoryProvider,
  ],
})
export class CancellationsModule {}
