import { Module } from '@nestjs/common';
import { ElevenIntegrationsController } from '@/modules/integrations/eleven/eleven-integrations.controller';
import { ElevenStatusService } from '@/modules/integrations/eleven/eleven-status.service';
import { ELEVEN_PROVIDER } from '@/modules/integrations/eleven/eleven.constants';
import { ElevenStubProvider } from '@/modules/integrations/eleven/eleven-stub.provider';

@Module({
  controllers: [ElevenIntegrationsController],
  providers: [
    ElevenStubProvider,
    ElevenStatusService,
    {
      provide: ELEVEN_PROVIDER,
      useExisting: ElevenStubProvider,
    },
  ],
  exports: [ELEVEN_PROVIDER, ElevenStatusService],
})
export class ElevenModule {}
