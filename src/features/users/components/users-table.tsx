import { StatusBadge } from '@/components/data-display/status-badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import {
  getRoleLabel,
  getUserStatusLabel,
  getUserStatusVariant,
} from '@/features/users/utils/user-labels';
import { type UserResponse } from '@/features/users/types/users-api.types';
import { formatDateTimePtBR } from '@/utils/formatters';

type UsersTableProps = {
  users: UserResponse[];
  onEdit: (user: UserResponse) => void;
};

export function UsersTable({ users, onEdit }: UsersTableProps) {
  return (
    <TableContainer>
      <Table className="min-w-[720px]">
        <TableHead>
          <tr>
            <TableHeaderCell>Nome</TableHeaderCell>
            <TableHeaderCell>E-mail</TableHeaderCell>
            <TableHeaderCell>Perfis</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Último acesso</TableHeaderCell>
            <TableHeaderCell>Ações</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="align-top font-medium">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatarUrl}
                    className="h-8 w-8 text-xs"
                  />
                  <span className="min-w-0">{user.name}</span>
                </div>
              </TableCell>
              <TableCell className="align-top text-neutral">
                {user.email}
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-neutral"
                    >
                      {getRoleLabel(role)}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <StatusBadge
                  label={getUserStatusLabel(user.status)}
                  variant={getUserStatusVariant(user.status)}
                />
              </TableCell>
              <TableCell className="align-top text-neutral">
                {user.lastLoginAt
                  ? formatDateTimePtBR(user.lastLoginAt)
                  : 'Nunca'}
              </TableCell>
              <TableCell className="align-top">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(user)}
                >
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
