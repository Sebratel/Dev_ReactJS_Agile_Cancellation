import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import type {
  GoogleTokenVerifier,
  GoogleVerifiedPayload,
} from '@/modules/auth/services/google-token-verifier';

const MOCK_TOKEN_PREFIX = 'mock:';

/**
 * Substitui a verificacao real do Google em ambiente de desenvolvimento/mock.
 * Aceita tokens "mock:<email>" para que o AuthService valide o usuario contra
 * a base configurada no ambiente.
 */
@Injectable()
export class GoogleTokenVerifierMockService implements GoogleTokenVerifier {
  verifyIdToken(idToken: string): Promise<GoogleVerifiedPayload> {
    if (!idToken.startsWith(MOCK_TOKEN_PREFIX)) {
      throw new AppException(
        'Token de login mock invalido.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const email = idToken.slice(MOCK_TOKEN_PREFIX.length).trim().toLowerCase();

    if (!email || !email.includes('@')) {
      throw new AppException(
        'E-mail de login mock invalido.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return Promise.resolve({
      email,
      name: email.split('@')[0] || email,
    });
  }
}
