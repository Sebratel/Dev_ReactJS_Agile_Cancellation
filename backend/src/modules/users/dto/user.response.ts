import type { UserStatus } from '@prisma/client';
import type { RoleCode } from '@/modules/auth/constants/role-codes.constants';
import type { UserRecord } from '@/modules/users/repositories/users.repository';

export type UserResponse = {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  roles: RoleCode[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toUserResponse(user: UserRecord): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    roles: user.roles,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
