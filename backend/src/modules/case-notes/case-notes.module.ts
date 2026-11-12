import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { CaseNotesController } from '@/modules/case-notes/case-notes.controller';
import { CaseNotesService } from '@/modules/case-notes/case-notes.service';
import { CaseNotesPrismaRepository } from '@/modules/case-notes/repositories/case-notes-prisma.repository';
import { CASE_NOTES_REPOSITORY } from '@/modules/case-notes/repositories/case-notes.repository';
import { PerformedByResolverService } from '@/modules/collection-cases/services/performed-by-resolver.service';

@Module({
  imports: [AuditModule],
  controllers: [CaseNotesController],
  providers: [
    CaseNotesService,
    PerformedByResolverService,
    {
      provide: CASE_NOTES_REPOSITORY,
      useClass: CaseNotesPrismaRepository,
    },
  ],
})
export class CaseNotesModule {}
