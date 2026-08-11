import type { Provider } from '@nestjs/common';
import { GOOGLE_TOKEN_VERIFIER } from '@/common/data-source/data-source.constants';
import { createGoogleTokenVerifier } from '@/modules/auth/repositories/google-token-verifier.factory';
import { GoogleTokenVerifierMockService } from '@/modules/auth/services/google-token-verifier.mock.service';
import { GoogleTokenVerifierService } from '@/modules/auth/services/google-token-verifier.service';

export const googleTokenVerifierProvider: Provider = {
  provide: GOOGLE_TOKEN_VERIFIER,
  useFactory: createGoogleTokenVerifier,
  inject: [GoogleTokenVerifierMockService, GoogleTokenVerifierService],
};
