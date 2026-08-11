import type { RoleCode } from '@/modules/auth/constants/role-codes.constants';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  roles: RoleCode[];
};

export type JwtPayload = {
  sub: string;
  email: string;
  roles: RoleCode[];
  devSession?: true;
};
