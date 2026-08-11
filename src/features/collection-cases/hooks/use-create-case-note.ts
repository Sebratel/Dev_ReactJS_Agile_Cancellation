import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCaseNote } from '@/features/collection-cases/services/case-notes.service';
import { type CreateCaseNotePayload } from '@/features/collection-cases/types/case-notes-api.types';
import { queryKeys } from '@/services/api/query-keys';

export function useCreateCaseNote(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCaseNotePayload) =>
      createCaseNote(caseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collectionCases.notes(caseId),
      });
    },
  });
}
