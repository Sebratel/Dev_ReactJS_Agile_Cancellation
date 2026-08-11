import type { RoleCode } from '@/modules/auth/constants/role-codes.constants';

export type AuthUserResponse = {
  id: string;
  email: string;
  name: string;
  roles: RoleCode[];
};

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = AuthTokensResponse & {
  user: AuthUserResponse;
};

export type RefreshResponse = AuthTokensResponse;

export type LogoutResponse = {
  success: true;
};
