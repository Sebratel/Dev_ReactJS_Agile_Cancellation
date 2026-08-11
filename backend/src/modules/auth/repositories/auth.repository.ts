import type { UserStatus } from '@prisma/client';
import type { RoleCode } from '@/modules/auth/constants/role-codes.constants';

export type AuthUserRecord = {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  refreshTokenHash: string | null;
  roles: RoleCode[];
};

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  findById(id: string): Promise<AuthUserRecord | null>;
  updateLastLogin(userId: string, lastLoginAt: Date): Promise<void>;
  updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void>;
}
