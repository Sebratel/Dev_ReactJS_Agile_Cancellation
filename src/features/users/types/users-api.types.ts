import { type UserRole } from '@/types/auth';

export const USER_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'BLOCKED',
  'PENDING_ACTIVATION',
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export type UserResponse = {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  roles: UserRole[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UsersListParams = {
  page?: number;
  limit?: number;
  status?: UserStatus;
  role?: UserRole;
  search?: string;
};

export type CreateUserPayload = {
  email: string;
  name: string;
  status?: UserStatus;
  roles: UserRole[];
};

export type UpdateUserPayload = {
  name?: string;
  status?: UserStatus;
  roles?: UserRole[];
};
