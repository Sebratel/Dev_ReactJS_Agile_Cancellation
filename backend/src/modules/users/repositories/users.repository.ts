import type { UserStatus } from '@prisma/client';
import type { RoleCode } from '@/modules/auth/constants/role-codes.constants';

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  status: UserStatus;
  roles: RoleCode[];
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ListUsersParams = {
  page: number;
  limit: number;
  status?: UserStatus;
  role?: RoleCode;
  search?: string;
};

export type ListUsersResult = {
  items: UserRecord[];
  total: number;
};

export type CreateUserData = {
  email: string;
  name: string;
  status: UserStatus;
  roleCodes: RoleCode[];
};

export type UpdateUserData = {
  name?: string;
  status?: UserStatus;
  roleCodes?: RoleCode[];
};

export interface UsersRepository {
  list(params: ListUsersParams): Promise<ListUsersResult>;
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  create(data: CreateUserData): Promise<UserRecord>;
  update(id: string, data: UpdateUserData): Promise<UserRecord | null>;
  countActiveAdmins(): Promise<number>;
}
