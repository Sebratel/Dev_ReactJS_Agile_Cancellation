import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorState } from '@/components/feedback/error-state';
import { useCreateUser } from '@/features/users/hooks/use-create-user';
import { useUpdateUser } from '@/features/users/hooks/use-update-user';
import {
  getRoleLabel,
  getUserStatusLabel,
} from '@/features/users/utils/user-labels';
import {
  USER_STATUSES,
  type UserResponse,
} from '@/features/users/types/users-api.types';
import { toast } from '@/lib/toast';
import { userRoles, type UserRole } from '@/types/auth';
import { ApiError } from '@/services/api/api-error';

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Acesso total, incluindo usuários e configurações.',
  SUPERVISOR: 'Supervisiona a carteira e distribui os casos.',
  COLLECTION_AGENT: 'Opera a fila de cobrança e registra tentativas.',
  CANCELLATION_AGENT: 'Conduz as etapas do processo de cancelamento.',
  FINANCE: 'Executa etapas financeiras e consulta clientes.',
  VIEWER: 'Somente leitura dos painéis operacionais.',
};

const baseSchema = {
  name: z.string().min(1, 'Informe o nome.').max(255),
  status: z.enum(USER_STATUSES),
  roles: z.array(z.enum(userRoles)).min(1, 'Selecione ao menos um perfil.'),
};

const createSchema = z.object({
  ...baseSchema,
  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
});

const editSchema = z.object(baseSchema);

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserResponse | null;
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral/80">
      {children}
    </p>
  );
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
}: UserFormDialogProps) {
  const isEditing = Boolean(user);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(isEditing ? editSchema : createSchema) as never,
    defaultValues: {
      name: '',
      email: '',
      status: 'ACTIVE',
      roles: [],
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      name: user?.name ?? '',
      email: user?.email ?? '',
      status: user?.status ?? 'ACTIVE',
      roles: user?.roles ?? [],
    });
  }, [open, user, reset]);

  async function onSubmit(values: CreateFormValues) {
    try {
      if (isEditing && user) {
        const payload: EditFormValues = {
          name: values.name,
          status: values.status,
          roles: values.roles,
        };
        await updateMutation.mutateAsync({ id: user.id, payload });
        toast.success('Usuário atualizado com sucesso.');
      } else {
        await createMutation.mutateAsync({
          email: values.email,
          name: values.name,
          status: values.status,
          roles: values.roles,
        });
        toast.success('Usuário criado com sucesso.');
      }

      onOpenChange(false);
    } catch {
      return;
    }
  }

  const apiErrorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.isError
        ? 'Não foi possível salvar o usuário.'
        : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {isEditing ? 'Editar usuário' : 'Novo usuário'}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-neutral">
                {isEditing
                  ? 'Atualize os dados, perfis e status do usuário.'
                  : 'Cadastre um novo usuário e defina seus perfis de acesso.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              void handleSubmit(onSubmit)(event);
            }}
          >
            <div className="space-y-3">
              <SectionLabel>Identidade</SectionLabel>

              <Field
                label="Nome"
                htmlFor="user-name"
                error={errors.name?.message}
              >
                <Input id="user-name" {...register('name')} />
              </Field>

              <Field
                label="E-mail"
                htmlFor="user-email"
                error={!isEditing ? errors.email?.message : undefined}
                hint={isEditing ? 'O e-mail não pode ser alterado.' : undefined}
              >
                <Input
                  id="user-email"
                  type="email"
                  disabled={isEditing}
                  {...register('email')}
                />
              </Field>
            </div>

            {!isEditing ? (
              <p className="rounded-xl border border-border bg-muted px-3 py-2.5 text-xs text-neutral">
                O acesso é liberado automaticamente no primeiro login com a
                conta Google corporativa (@sebratel.com.br) correspondente a
                este e-mail.
              </p>
            ) : null}

            <div className="space-y-3 border-t border-border pt-3">
              <SectionLabel>Status e permissões</SectionLabel>

              <Field label="Status" htmlFor="user-status">
                <Select id="user-status" {...register('status')}>
                  {USER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {getUserStatusLabel(status)}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="space-y-2">
                <span className="block text-sm font-medium">
                  Perfis de acesso
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {userRoles.map((role) => (
                    <label
                      key={role}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-3 py-2.5 transition-colors duration-150 hover:border-neutral/40 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5"
                    >
                      <input
                        type="checkbox"
                        value={role}
                        className="mt-0.5"
                        {...register('roles')}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {getRoleLabel(role)}
                        </span>
                        <span className="block text-xs leading-5 text-neutral">
                          {ROLE_DESCRIPTIONS[role]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.roles ? (
                  <p className="text-sm text-danger" role="alert">
                    {errors.roles.message as string}
                  </p>
                ) : null}
              </div>
            </div>

            {apiErrorMessage ? (
              <ErrorState
                title="Falha ao salvar usuário"
                description={apiErrorMessage}
              />
            ) : null}

            <div className="flex justify-end gap-3 border-t border-border pt-3">
              <Dialog.Close asChild>
                <Button variant="secondary">Cancelar</Button>
              </Dialog.Close>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
