import { httpClient } from '@/services/api/http-client';
import type {
  CaseNoteResponse,
  CreateCaseNotePayload,
} from '@/features/collection-cases/types/case-notes-api.types';

export async function getCaseNotes(
  caseId: string,
): Promise<CaseNoteResponse[]> {
  const { data } = await httpClient.request<CaseNoteResponse[]>({
    path: `/collection-cases/${caseId}/notes`,
    method: 'GET',
  });
  return data;
}

export async function createCaseNote(
  caseId: string,
  payload: CreateCaseNotePayload,
): Promise<CaseNoteResponse> {
  const { data } = await httpClient.request<CaseNoteResponse>({
    path: `/collection-cases/${caseId}/notes`,
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
}
