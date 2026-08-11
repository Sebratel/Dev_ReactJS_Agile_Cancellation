import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
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

  async listByCase(caseId: string) {
    const notes = await this.repository.listByCase(caseId);

    if (!notes) {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createApiResponse(notes);
  }

  async create(caseId: string, dto: CreateCaseNoteDto, authenticatedUserId: string) {
    const authorId = this.performedByResolver.resolve(authenticatedUserId);

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
