import { Body, Controller, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { CancellationsService } from '@/modules/cancellations/cancellations.service';
import { CompleteCancellationStepDto } from '@/modules/cancellations/dto/complete-cancellation-step.dto';
import { CreateElevenRequestDto } from '@/modules/cancellations/dto/create-eleven-request.dto';
import { ElevenIntegrationService } from '@/modules/integrations/eleven/eleven-integration.service';

@Controller('cancellations')
export class CancellationsController {
  constructor(
    private readonly cancellationsService: CancellationsService,
    private readonly elevenIntegrationService: ElevenIntegrationService,
  ) {}

  @Roles('CANCELLATION_AGENT', 'SUPERVISOR', 'ADMIN', 'FINANCE')
  @Post(':cancellationId/eleven/request')
  createElevenRequest(
    @Param('cancellationId') cancellationId: string,
    @Body() body: CreateElevenRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.elevenIntegrationService.createCancellationRequest(
      cancellationId,
      body,
      user,
    );
  }

  @Roles('CANCELLATION_AGENT', 'SUPERVISOR', 'ADMIN', 'FINANCE')
  @Post(':cancellationId/steps/:stepCode/complete')
  completeStep(
    @Param('cancellationId') cancellationId: string,
    @Param('stepCode') stepCode: string,
    @Body() body: CompleteCancellationStepDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cancellationsService.completeStep(
      cancellationId,
      stepCode,
      body,
      user,
    );
  }
}
