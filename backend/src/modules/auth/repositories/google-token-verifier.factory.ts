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
  return getGoogleAuthConfig().clientId ? realVerifier : mockVerifier;
}
