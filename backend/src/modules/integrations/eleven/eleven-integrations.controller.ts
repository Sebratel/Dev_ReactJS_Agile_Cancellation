import { Controller, Get } from '@nestjs/common';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { ElevenStatusService } from '@/modules/integrations/eleven/eleven-status.service';

@Controller('integrations/eleven')
export class ElevenIntegrationsController {
  constructor(private readonly elevenStatusService: ElevenStatusService) {}

  @Roles('ADMIN', 'SUPERVISOR', 'CANCELLATION_AGENT')
  @Get('status')
  getStatus() {
    return this.elevenStatusService.getStatus();
  }
}
