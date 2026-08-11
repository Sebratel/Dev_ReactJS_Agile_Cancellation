import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { MOCK_AUTH_USER_DEFINITIONS } from '@/modules/auth/mocks/mock-auth-users';
import type {
  GoogleTokenVerifier,
  GoogleVerifiedPayload,
} from '@/modules/auth/services/google-token-verifier';

const MOCK_TOKEN_PREFIX = 'mock:';

/**
 * Substitui a verificacao real do Google em ambiente de desenvolvimento/mock,
 * quando nao ha um Client ID real configurado. Aceita tokens no formato
 * "mock:<email>" e resolve contra a lista de usuarios mock existente, para
 * que o fluxo de login possa ser testado localmente sem depender do Google.
 */
@Injectable()
export class GoogleTokenVerifierMockService implements GoogleTokenVerifier {
  verifyIdToken(idToken: string): Promise<GoogleVerifiedPayload> {
    if (!idToken.startsWith(MOCK_TOKEN_PREFIX)) {
      throw new AppException(
        'Token de login mock inválido.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const email = idToken.slice(MOCK_TOKEN_PREFIX.length).trim().toLowerCase();
    const mockUser = MOCK_AUTH_USER_DEFINITIONS.find(
      (definition) => definition.email.toLowerCase() === email,
    );

    if (!mockUser) {
      throw new AppException(
        'Conta mock não encontrada.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return Promise.resolve({
      email: mockUser.email.toLowerCase(),
      name: mockUser.name,
    });
  }
}
