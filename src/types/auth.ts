export const userRoles = [
  'ADMIN',
  'SUPERVISOR',
  'FINANCE',
  'COLLECTION_AGENT',
  'CANCELLATION_AGENT',
  'VIEWER',
] as const;

export type UserRole = (typeof userRoles)[number];

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  roles: UserRole[];
  role: UserRole;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type GoogleLoginCredentials = {
  idToken: string;
};

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';
