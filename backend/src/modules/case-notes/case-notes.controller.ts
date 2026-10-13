import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { CaseNotesService } from '@/modules/case-notes/case-notes.service';
import { CreateCaseNoteDto } from '@/modules/case-notes/dto/create-case-note.dto';

@Controller('collection-cases/:caseId/notes')
export class CaseNotesController {
  constructor(private readonly caseNotesService: CaseNotesService) {}

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT', 'CANCELLATION_AGENT')
  @Get()
  list(@Param('caseId') caseId: string) {
    return this.caseNotesService.listByCase(caseId);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT', 'CANCELLATION_AGENT')
  @Post()
  create(
    @Param('caseId') caseId: string,
    @Body() body: CreateCaseNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.caseNotesService.create(caseId, body, user);
  }
}
