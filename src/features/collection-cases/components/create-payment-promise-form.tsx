import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { SectionCard } from '@/components/data-display/section-card';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreatePaymentPromise } from '@/features/collection-cases/hooks/use-create-payment-promise';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

const createPromiseSchema = z.object({
  promisedAmount: z.preprocess(
    (value) => {
      if (
        value === '' ||
        value === null ||
        value === undefined ||
        (typeof value === 'number' && Number.isNaN(value))
      ) {
        return undefined;
      }

      return Number(value);
    },
    z
      .number({ error: 'Informe o valor prometido.' })
      .min(0.01, 'Informe um valor maior que zero.'),
  ),
  promisedDate: z.string().min(1, 'Informe a data prometida.'),
  notes: z
    .string()
    .max(1000, 'A observação deve ter no máximo 1000 caracteres.')
    .optional(),
});

type CreatePromiseFormValues = {
  promisedAmount: number;
  promisedDate: string;
  notes?: string;
};

const defaultValues: CreatePromiseFormValues = {
  promisedAmount: Number.NaN,
  promisedDate: '',
  notes: '',
};

type CreatePaymentPromiseFormProps = {
  caseId: string;
};

export function CreatePaymentPromiseForm({
  caseId,
}: CreatePaymentPromiseFormProps) {
  const mutation = useCreatePaymentPromise(caseId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePromiseFormValues>({
    resolver: zodResolver(
      createPromiseSchema,
    ) as Resolver<CreatePromiseFormValues>,
    defaultValues,
  });

  async function onSubmit(values: CreatePromiseFormValues) {
    const payload = {
      promisedAmount: values.promisedAmount,
      promisedDate: new Date(values.promisedDate).toISOString(),
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    };

    try {
      await mutation.mutateAsync(payload);
      reset(defaultValues);
      toast.success('Promessa registrada com sucesso.');
    } catch {
      return;
    }
  }

  const apiErrorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.isError
        ? 'Não foi possível registrar a promessa.'
        : null;

  return (
    <SectionCard
      title="Nova promessa de pagamento"
      description="Registre um acordo de pagamento para regularização do caso."
    >
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
      >
        <Field
          label="Valor prometido"
          htmlFor="promise-amount"
          error={errors.promisedAmount?.message}
        >
          <Input
            id="promise-amount"
            type="number"
            step="0.01"
            placeholder="0,00"
            {...register('promisedAmount', { valueAsNumber: true })}
          />
        </Field>

        <Field
          label="Data prometida"
          htmlFor="promise-date"
          error={errors.promisedDate?.message}
        >
          <Input id="promise-date" type="date" {...register('promisedDate')} />
        </Field>

        <Field
          label="Observação"
          htmlFor="promise-notes"
          error={errors.notes?.message}
          className="md:col-span-2"
        >
          <Textarea
            id="promise-notes"
            rows={3}
            placeholder="Detalhes do acordo registrado."
            {...register('notes')}
          />
        </Field>

        {apiErrorMessage ? (
          <div className="md:col-span-2">
            <ErrorState
              title="Falha ao registrar promessa"
              description={apiErrorMessage}
            />
          </div>
        ) : null}

        <div className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar promessa'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
