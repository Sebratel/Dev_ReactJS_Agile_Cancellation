import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { SectionCard } from '@/components/data-display/section-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCaseNotes } from '@/features/collection-cases/hooks/use-case-notes';
import { useCreateCaseNote } from '@/features/collection-cases/hooks/use-create-case-note';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';
import { formatDateTimePtBR } from '@/utils/formatters';

type CaseNotesSectionProps = {
  caseId: string;
};

export function CaseNotesSection({ caseId }: CaseNotesSectionProps) {
  const notesQuery = useCaseNotes(caseId);
  const createNote = useCreateCaseNote(caseId);
  const [content, setContent] = useState('');

  const handleRetry = () => { void notesQuery.refetch(); };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      await createNote.mutateAsync({ content: trimmed });
      setContent('');
      toast.success('Comentário adicionado.');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Não foi possível salvar o comentário.',
      );
    }
  }

  const notes = notesQuery.data ?? [];

  return (
    <SectionCard
      title="Comentários internos"
      description="Observações livres da equipe, não visíveis para o cliente."
      contentClassName="space-y-4"
    >
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-2">
        <Textarea
          rows={2}
          placeholder="Adicione uma observação interna sobre este caso..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || createNote.isPending}
          >
            {createNote.isPending ? 'Salvando...' : 'Comentar'}
          </Button>
        </div>
      </form>

      {notesQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar os comentários"
          description="Verifique a conexão com o servidor e tente novamente."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!notesQuery.isLoading && !notesQuery.isError && notes.length === 0 ? (
        <EmptyState
          title="Nenhum comentário ainda"
          description="Seja o primeiro a deixar uma observação sobre este caso."
        />
      ) : null}

      {notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral" />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {note.content}
                  </p>
                  <p className="mt-1 text-xs text-neutral">
                    {note.author?.name ?? 'Sistema'} · {formatDateTimePtBR(note.createdAt)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
