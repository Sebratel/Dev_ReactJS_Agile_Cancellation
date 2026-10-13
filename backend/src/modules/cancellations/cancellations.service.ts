import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CANCELLATIONS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import type { CompleteCancellationStepDto } from '@/modules/cancellations/dto/complete-cancellation-step.dto';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { assertCanActOnCase } from '@/modules/collection-cases/utils/case-ownership.util';
import { CancellationStepPolicyService } from '@/modules/cancellations/policies/cancellation-step-policy.service';
import {
  type CancellationsRepository,
  type CompleteCancellationStepResult,
  mapCompleteCancellationStepDtoToInput,
} from '@/modules/cancellations/repositories/cancellations.repository';
import { PerformedByResolverService } from '@/modules/collection-cases/services/performed-by-resolver.service';

@Injectable()
export class CancellationsService {
  constructor(
    @Inject(CANCELLATIONS_REPOSITORY)
    private readonly cancellationsRepository: CancellationsRepository,
    private readonly performedByResolver: PerformedByResolverService,
    private readonly cancellationStepPolicyService: CancellationStepPolicyService,
  ) {}

  async completeStep(
    cancellationId: string,
    stepCode: string,
    dto: CompleteCancellationStepDto,
    actor: AuthenticatedUser,
  ) {
    const processContextResult =
      await this.cancellationsRepository.getProcessContext(cancellationId);

    if (processContextResult.outcome === 'process_not_found') {
      throw new AppException(
        `Processo de cancelamento ${cancellationId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const targetStep = processContextResult.context.steps.find(
      (step) => step.stepCode === stepCode,
    );

    if (!targetStep) {
      throw new AppException(
        `Etapa ${stepCode} não encontrada no processo ${cancellationId}.`,
        HttpStatus.NOT_FOUND,
      );
    }

    assertCanActOnCase(actor, processContextResult.context.caseAssignedUserId);

    this.cancellationStepPolicyService.assertStepCompletionAllowed({
      context: processContextResult.context,
      stepCode,
      roles: actor.roles,
      completionSource: 'generic',
    });

    const performedByUserId = this.performedByResolver.resolve(actor.id);

    const result = await this.cancellationsRepository.completeStep({
      cancellationId,
      stepCode,
      input: mapCompleteCancellationStepDtoToInput(dto),
      performedByUserId,
      performedByName: actor.name,
    });

    this.assertCompleteStepResult(result, cancellationId, stepCode);

    if (result.outcome !== 'success') {
      throw new AppException(
        'Falha ao concluir etapa de cancelamento.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return createApiResponse(result.step);
  }

  private assertCompleteStepResult(
    result: CompleteCancellationStepResult,
    cancellationId: string,
    stepCode: string,
  ) {
    if (result.outcome === 'process_not_found') {
      throw new AppException(
        `Processo de cancelamento ${cancellationId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'step_not_found') {
      throw new AppException(
        `Etapa ${stepCode} não encontrada no processo ${cancellationId}.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'step_already_completed') {
      throw new AppException(
        `Etapa ${stepCode} já foi concluída no processo ${cancellationId}.`,
        HttpStatus.CONFLICT,
      );
    }
  }
}
