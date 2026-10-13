import { getGoogleAuthConfig } from '@/config/google-auth.config';
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

  // Defesa em profundidade: nunca devolve o mock em producao.
  if (process.env.NODE_ENV === 'production') {
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
