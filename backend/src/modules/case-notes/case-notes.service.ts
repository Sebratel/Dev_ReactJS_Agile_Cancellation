import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import {
  assertCanActOnCase,
  isRestrictedToOwnCases,
} from '@/modules/collection-cases/utils/case-ownership.util';
import type { CreateCaseNoteDto } from '@/modules/case-notes/dto/create-case-note.dto';
import {
  CASE_NOTES_REPOSITORY,
  type CaseNotesRepository,
} from '@/modules/case-notes/repositories/case-notes.repository';
import { PerformedByResolverService } from '@/modules/collection-cases/services/performed-by-resolver.service';

@Injectable()
export class CaseNotesService {
  constructor(
    @Inject(CASE_NOTES_REPOSITORY)
    private readonly repository: CaseNotesRepository,
    private readonly performedByResolver: PerformedByResolverService,
  ) {}

  async listByCase(caseId: string, actor?: AuthenticatedUser) {
    // Mesma regra do detalhe do caso: atendente so le notas de caso proprio
    // (nao-dono recebe 404, sem revelar que o caso existe).
    if (actor && isRestrictedToOwnCases(actor)) {
      const assigneeId = await this.repository.getCaseAssigneeId(caseId);

      if (assigneeId !== undefined && assigneeId !== actor.id) {
        throw new AppException(
          `Caso de cobrança ${caseId} não encontrado.`,
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const notes = await this.repository.listByCase(caseId);

    if (!notes) {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createApiResponse(notes);
  }

  async create(caseId: string, dto: CreateCaseNoteDto, actor: AuthenticatedUser) {
    const assigneeId = await this.repository.getCaseAssigneeId(caseId);

    // Caso inexistente cai no 404 abaixo; atendente so anota em caso proprio.
    if (assigneeId !== undefined) {
      assertCanActOnCase(actor, assigneeId);
    }

    const authorId = this.performedByResolver.resolve(actor.id);

    const note = await this.repository.create({
      caseId,
      content: dto.content,
      authorId,
    });

    if (!note) {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createApiResponse(note);
  }
}
