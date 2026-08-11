import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { hasAnyRole } from '@/features/auth/utils/role-utils';
import { type UserRole } from '@/types/auth';

type RoleGuardProps = {
  allowedRoles: UserRole[];
};

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { session, status } = useAuth();

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex min-h-[200px] items-center justify-center bg-background px-4">
        <div className="rounded-2xl bg-card px-6 py-5 text-sm text-neutral shadow-card">
          Carregando sessão...
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyRole(session.user.roles, allowedRoles)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <Outlet />;
}
