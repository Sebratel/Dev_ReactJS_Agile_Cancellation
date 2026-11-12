import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SectionCard } from '@/components/data-display/section-card';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCollectionAttempt } from '@/features/collection-cases/hooks/use-create-collection-attempt';
import {
  ATTEMPT_CHANNEL_OPTIONS,
  ATTEMPT_RESULT_OPTIONS,
  getAttemptChannelLabel,
  getAttemptResultLabel,
} from '@/features/collection-cases/utils/collection-case-labels';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

const createAttemptSchema = z.object({
  channel: z.string().min(1, 'Selecione o canal.'),
  result: z.string().min(1, 'Selecione o resultado.'),
  notes: z
    .string()
    .max(1000, 'A observação deve ter no máximo 1000 caracteres.')
    .optional(),
  nextContactAt: z.string().optional(),
});

type CreateAttemptFormValues = z.infer<typeof createAttemptSchema>;

const defaultValues: CreateAttemptFormValues = {
  channel: '',
  result: '',
  notes: '',
  nextContactAt: '',
};

type CreateCollectionAttemptFormProps = {
  caseId: string;
  // Cancelado em recuperação: a observação é obrigatória (ela, com o contato
  // efetivo, é a prova que credita a receita quando o ERP reativar o contrato).
  notesRequired?: boolean;
};

export function CreateCollectionAttemptForm({
  caseId,
  notesRequired = false,
}: CreateCollectionAttemptFormProps) {
  const mutation = useCreateCollectionAttempt(caseId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAttemptFormValues>({
    resolver: zodResolver(
      notesRequired
        ? createAttemptSchema.extend({
            notes: z
              .string()
              .trim()
              .min(1, 'Informe a observação do contato.')
              .max(1000, 'A observação deve ter no máximo 1000 caracteres.'),
          })
        : createAttemptSchema,
    ),
    defaultValues,
  });

  async function onSubmit(values: CreateAttemptFormValues) {
    const payload = {
      channel: values.channel,
      result: values.result,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
      nextContactAt: values.nextContactAt
        ? new Date(values.nextContactAt).toISOString()
        : undefined,
    };

    try {
      await mutation.mutateAsync(payload);
      reset(defaultValues);
      toast.success('Tentativa registrada com sucesso.');
    } catch {
      return;
    }
  }

  const apiErrorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.isError
        ? 'Não foi possível registrar a tentativa.'
        : null;

  return (
    <SectionCard
      title="Nova tentativa de cobrança"
      description="Registre uma nova abordagem realizada para este caso."
    >
      <form
        className="grid gap-4 md:grid-cols-3"
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
      >
        <Field
          label="Canal"
          htmlFor="attempt-channel"
          error={errors.channel?.message}
        >
          <Select id="attempt-channel" defaultValue="" {...register('channel')}>
            <option value="" disabled>
              Selecione o canal
            </option>
            {ATTEMPT_CHANNEL_OPTIONS.map((channel) => (
              <option key={channel} value={channel}>
                {getAttemptChannelLabel(channel)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Resultado"
          htmlFor="attempt-result"
          error={errors.result?.message}
        >
          <Select id="attempt-result" defaultValue="" {...register('result')}>
            <option value="" disabled>
              Selecione o resultado
            </option>
            {ATTEMPT_RESULT_OPTIONS.map((result) => (
              <option key={result} value={result}>
                {getAttemptResultLabel(result)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Próximo contato (opcional)"
          htmlFor="attempt-next-contact"
        >
          <Input
            id="attempt-next-contact"
            type="datetime-local"
            {...register('nextContactAt')}
          />
        </Field>

        <Field
          label={notesRequired ? 'Observação (obrigatória)' : 'Observação'}
          htmlFor="attempt-notes"
          error={errors.notes?.message}
          className="md:col-span-3"
        >
          <Textarea
            id="attempt-notes"
            rows={2}
            placeholder="Detalhes da abordagem realizada."
            {...register('notes')}
          />
        </Field>

        {apiErrorMessage ? (
          <div className="md:col-span-3">
            <ErrorState
              title="Falha ao registrar tentativa"
              description={apiErrorMessage}
            />
          </div>
        ) : null}

        <div className="flex justify-end md:col-span-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar tentativa'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
