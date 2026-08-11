import { Module } from '@nestjs/common';
import { ElevenModule } from '@/modules/integrations/eleven/eleven.module';

@Module({
  imports: [ElevenModule],
  exports: [ElevenModule],
})
export class IntegrationsModule {}
