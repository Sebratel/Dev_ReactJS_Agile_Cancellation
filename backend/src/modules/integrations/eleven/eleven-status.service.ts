import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ElevenConfig } from '@/config/eleven.config';
import { createApiResponse } from '@/common/responses/api-response';
import { buildElevenIntegrationStatus } from '@/modules/integrations/eleven/utils/eleven-integration-status.util';

@Injectable()
export class ElevenStatusService {
  constructor(private readonly configService: ConfigService) {}

  getStatus() {
    const elevenConfig = this.configService.get<ElevenConfig>('eleven');
    const mode = elevenConfig?.mode ?? 'stub';

    return createApiResponse(buildElevenIntegrationStatus(mode));
  }
}
