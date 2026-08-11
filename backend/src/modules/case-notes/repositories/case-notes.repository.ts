import type { CaseNoteResponse } from '@/modules/case-notes/dto/case-note.response';

export type CreateCaseNoteParams = {
  caseId: string;
  content: string;
  authorId: string | null;
};

export interface CaseNotesRepository {
  listByCase(caseId: string): Promise<CaseNoteResponse[] | null>;
  create(params: CreateCaseNoteParams): Promise<CaseNoteResponse | null>;
}

export const CASE_NOTES_REPOSITORY = 'CASE_NOTES_REPOSITORY';
