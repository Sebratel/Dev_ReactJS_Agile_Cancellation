import { useMemo, useState } from 'react';
import { ShieldCheck, UserCheck, UserPlus, UsersRound } from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { UsersTable } from '@/features/users/components/users-table';
import { UserFormDialog } from '@/features/users/components/user-form-dialog';
import { useUsers } from '@/features/users/hooks/use-users';
import { getUserStatusLabel } from '@/features/users/utils/user-labels';
import {
  USER_STATUSES,
  type UserResponse,
  type UserStatus,
} from '@/features/users/types/users-api.types';
import { formatInteger } from '@/utils/formatters';

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      status: status || undefined,
    }),
    [page, debouncedSearch, status],
  );

  const usersQuery = useUsers(params);

  const items = usersQuery.data?.items ?? [];
  const totalUsers = usersQuery.data?.pagination.total ?? 0;
  const totalPages = Math.max(usersQuery.data?.pagination.totalPages ?? 1, 1);
  const hasActiveFilters = debouncedSearch.trim().length > 0 || status !== '';
  const activeUsers = items.filter((user) => user.status === 'ACTIVE').length;
  const adminUsers = items.filter((user) =>
    user.roles.includes('ADMIN'),
  ).length;

  const handleRetry = () => {
    void usersQuery.refetch();
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setStatus('');
    setPage(1);
  };

  const openCreate = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  const openEdit = (user: UserResponse) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Usuários"
        description="Cadastro, perfis de acesso e status dos usuários da plataforma."
        actions={
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Novo usuário
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          title="Usuários encontrados"
          value={formatInteger(totalUsers)}
          description="Resultado da consulta atual"
          icon={UsersRound}
          loading={usersQuery.isLoading}
          emphasis="primary"
        />
        <MetricCard
          title="Ativos nesta página"
          value={formatInteger(activeUsers)}
          description="Contas disponíveis para operação"
          icon={UserCheck}
          variant="success"
          loading={usersQuery.isLoading}
        />
        <MetricCard
          title="Administradores"
          value={formatInteger(adminUsers)}
          description="Na página carregada"
          icon={ShieldCheck}
          loading={usersQuery.isLoading}
        />
      </div>

      <SectionCard
        title="Filtros"
        description="Encontre usuários por nome, e-mail ou status operacional."
        contentClassName="flex flex-wrap items-center gap-3"
      >
        <Input
          type="search"
          className="min-w-[220px] flex-1 sm:max-w-sm"
          placeholder="Buscar por nome ou e-mail"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          aria-label="Buscar usuários"
        />
        <Select
          className="sm:w-48"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as UserStatus | '');
            setPage(1);
          }}
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          {USER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {getUserStatusLabel(value)}
            </option>
          ))}
        </Select>
      </SectionCard>

      {usersQuery.isLoading ? <TableSkeleton rows={6} columns={6} /> : null}

      {usersQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar os usuários"
          description="Tente novamente ou entre em contato com o suporte."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError && items.length === 0 ? (
        <EmptyState
          title="Nenhum usuário encontrado"
          description={
            hasActiveFilters
              ? 'Nenhum usuário corresponde aos filtros aplicados. Ajuste ou limpe os filtros.'
              : 'Cadastre o primeiro usuário da plataforma.'
          }
          actionLabel={hasActiveFilters ? 'Limpar filtros' : 'Novo usuário'}
          onAction={hasActiveFilters ? handleClearFilters : openCreate}
        />
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError && items.length > 0 ? (
        <>
          <UsersTable users={items} onEdit={openEdit} />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
      />
    </PageContainer>
  );
}
