let accessTokenGetter: () => string | null = () => null;
let refreshTokenGetter: () => string | null = () => null;
let sessionTokensUpdater:
  | ((tokens: { accessToken: string; refreshToken: string }) => void)
  | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessTokenGetter(getter: () => string | null) {
  accessTokenGetter = getter;
}

export function setRefreshTokenGetter(getter: () => string | null) {
  refreshTokenGetter = getter;
}

export function setSessionTokensUpdater(
  updater: (tokens: { accessToken: string; refreshToken: string }) => void,
) {
  sessionTokensUpdater = updater;
}

export function getAccessToken() {
  return accessTokenGetter();
}

export function getRefreshToken() {
  return refreshTokenGetter();
}

export function updateSessionTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  sessionTokensUpdater?.(tokens);
}

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}
