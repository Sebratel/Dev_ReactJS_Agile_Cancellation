export type GoogleVerifiedPayload = {
  email: string;
  name: string;
};

export interface GoogleTokenVerifier {
  /**
   * Verifica o ID token do Google e retorna o e-mail/nome verificados.
   * Deve lancar erro se o token for invalido, expirado, o e-mail nao estiver
   * verificado, ou o dominio nao pertencer ao workspace corporativo.
   */
  verifyIdToken(idToken: string): Promise<GoogleVerifiedPayload>;
}
