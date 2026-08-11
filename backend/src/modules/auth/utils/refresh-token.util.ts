import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';

const REFRESH_TOKEN_SEPARATOR = ':';

export function generateRefreshToken(userId: string): string {
  const secret = randomBytes(32).toString('base64url');
  return `${userId}${REFRESH_TOKEN_SEPARATOR}${secret}`;
}

export function parseRefreshToken(
  refreshToken: string,
): { userId: string; secret: string } | null {
  const separatorIndex = refreshToken.indexOf(REFRESH_TOKEN_SEPARATOR);

  if (separatorIndex <= 0) {
    return null;
  }

  const userId = refreshToken.slice(0, separatorIndex);
  const secret = refreshToken.slice(separatorIndex + 1);

  if (!userId || !secret) {
    return null;
  }

  return { userId, secret };
}

export async function hashRefreshToken(refreshToken: string): Promise<string> {
  return argon2.hash(refreshToken);
}

export async function verifyRefreshToken(
  refreshTokenHash: string,
  refreshToken: string,
): Promise<boolean> {
  return argon2.verify(refreshTokenHash, refreshToken);
}
