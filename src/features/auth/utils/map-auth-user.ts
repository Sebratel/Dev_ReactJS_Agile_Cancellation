import { type UserRole, userRoles } from '@/types/auth';

export function isUserRole(value: string): value is UserRole {
  return userRoles.includes(value as UserRole);
}

export function mapAuthUserFromApi(user: {
  id: string;
  email: string;
  name: string;
  roles: string[];
}) {
  const roles = user.roles.filter(isUserRole);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles,
  };
}
