import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CANCELLATIONS_REPOSITORY } from '@/common/data-source/data-source.constants';
import type { ElevenConfig } from '@/config/eleven.config';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import type { CreateElevenRequestDto } from '@/modules/cancellations/dto/create-eleven-request.dto';
import { assertCanActOnCase } from '@/modules/collection-cases/utils/case-ownership.util';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { CancellationStepPolicyService } from '@/modules/cancellations/policies/cancellation-step-policy.service';
import {
  type CancellationsRepository,
  type CompleteCancellationStepResult,
  type ElevenRequestEligibilityResult,
} from '@/modules/cancellations/repositories/cancellations.repository';
import { PerformedByResolverService } from '@/modules/collection-cases/services/performed-by-resolver.service';
import { ELEVEN_PROVIDER } from '@/modules/integrations/eleven/eleven.constants';
import type { ElevenProvider } from '@/modules/integrations/eleven/eleven-provider.interface';

@Injectable()
export class ElevenIntegrationService {
  constructor(
    @Inject(ELEVEN_PROVIDER)
    private readonly elevenProvider: ElevenProvider,
    @Inject(CANCELLATIONS_REPOSITORY)
    private readonly cancellationsRepository: CancellationsRepository,
    private readonly performedByResolver: PerformedByResolverService,
    private readonly configService: ConfigService,
    private readonly cancellationStepPolicyService: CancellationStepPolicyService,
  ) {}

  async createCancellationRequest(
    cancellationId: string,
    dto: CreateElevenRequestDto,
    actor: AuthenticatedUser,
  ) {
    const elevenConfig = this.configService.get<ElevenConfig>('eleven');

    if (elevenConfig?.mode === 'disabled') {
      throw new AppException(
        'Integração Eleven desabilitada neste ambiente.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const processContextResult =
      await this.cancellationsRepository.getProcessContext(cancellationId);

    if (processContextResult.outcome === 'process_not_found') {
      throw new AppException(
        `Processo de cancelamento ${cancellationId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    assertCanActOnCase(actor, processContextResult.context.caseAssignedUserId);

    this.cancellationStepPolicyService.assertStepCompletionAllowed({
      context: processContextResult.context,
      stepCode: 'OPEN_ELEVEN_REQUEST',
      roles: actor.roles,
      completionSource: 'eleven',
    });

    const eligibility =
      await this.cancellationsRepository.validateElevenRequestEligibility(
        cancellationId,
      );

    this.assertElevenRequestEligibility(eligibility, cancellationId);

    const providerResult = await this.elevenProvider.createCancellationRequest({
      cancellationId,
      notes: dto.notes,
    });

    const performedByUserId = this.performedByResolver.resolve(actor.id);

    const result = await this.cancellationsRepository.completeStep({
      cancellationId,
      stepCode: 'OPEN_ELEVEN_REQUEST',
      input: {
        notes: dto.notes,
        externalProtocol: providerResult.protocol,
      },
      performedByUserId,
      performedByName: actor.name,
      integrationMetadata: {
        integration: 'ELEVEN',
        elevenMode: elevenConfig?.mode ?? 'stub',
        action: 'CREATE_REQUEST',
      },
    });

    this.assertCompleteStepResult(result, cancellationId);

    if (result.outcome !== 'success') {
      throw new AppException(
        'Falha ao registrar solicitação Eleven.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return createApiResponse({
      protocol: providerResult.protocol,
      step: result.step,
    });
  }

  private assertElevenRequestEligibility(
    result: ElevenRequestEligibilityResult,
    cancellationId: string,
  ) {
    if (result.outcome === 'process_not_found') {
      throw new AppException(
        `Processo de cancelamento ${cancellationId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'process_already_completed') {
      throw new AppException(
        `Processo de cancelamento ${cancellationId} já foi concluído.`,
        HttpStatus.CONFLICT,
        { code: 'cancellation_already_completed' },
      );
    }

    if (result.outcome === 'step_not_found') {
      throw new AppException(
        `Etapa OPEN_ELEVEN_REQUEST não encontrada no processo ${cancellationId}.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'step_already_completed') {
      throw new AppException(
        `Etapa OPEN_ELEVEN_REQUEST já foi concluída no processo ${cancellationId}.`,
        HttpStatus.CONFLICT,
      );
    }
  }

  private assertCompleteStepResult(
    result: CompleteCancellationStepResult,
    cancellationId: string,
  ) {
    if (result.outcome === 'process_not_found') {
      throw new AppException(
        `Processo de cancelamento ${cancellationId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'step_not_found') {
      throw new AppException(
        `Etapa OPEN_ELEVEN_REQUEST não encontrada no processo ${cancellationId}.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'step_already_completed') {
      throw new AppException(
        `Etapa OPEN_ELEVEN_REQUEST já foi concluída no processo ${cancellationId}.`,
        HttpStatus.CONFLICT,
      );
    }
  }
}
