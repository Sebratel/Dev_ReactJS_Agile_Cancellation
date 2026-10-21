import { getGoogleAuthConfig } from '@/config/google-auth.config';
import { isDevLoginEnabled } from '@/modules/auth/utils/dev-login.util';
import type { GoogleTokenVerifier } from '@/modules/auth/services/google-token-verifier';
import type { GoogleTokenVerifierMockService } from '@/modules/auth/services/google-token-verifier.mock.service';
import type { GoogleTokenVerifierService } from '@/modules/auth/services/google-token-verifier.service';

/**
 * A verificacao real do Google so entra em jogo quando ha um GOOGLE_CLIENT_ID
 * configurado. Sem ele (dev local, testes, ambientes sem o Client ID ainda
 * provisionado), cai no verificador mock — independente do DATA_SOURCE_MODE.
 */
export function createGoogleTokenVerifier(
  mockVerifier: GoogleTokenVerifierMockService,
  realVerifier: GoogleTokenVerifierService,
): GoogleTokenVerifier {
  const config = getGoogleAuthConfig();

  // O mock (aceita "mock:<email>") so com a lista de permissao de dev;
  // em qualquer outro ambiente o verificador real, sem falhar o boot.
  if (!isDevLoginEnabled()) {
    return realVerifier;
  }

  if (config.mode === 'mock') {
    return mockVerifier;
  }

  if (config.mode === 'real') {
    return realVerifier;
  }

  return config.clientId ? realVerifier : mockVerifier;
}
