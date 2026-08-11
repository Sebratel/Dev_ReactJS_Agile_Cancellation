export type AuthUserApiResponse = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

export type AuthTokensApiResponse = {
  accessToken: string;
  refreshToken: string;
};

export type LoginApiResponse = AuthTokensApiResponse & {
  user: AuthUserApiResponse;
};

export type RefreshApiResponse = AuthTokensApiResponse;

export type LogoutApiResponse = {
  success: true;
};

export type MeApiResponse = AuthUserApiResponse;
