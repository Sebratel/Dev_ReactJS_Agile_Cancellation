const apiBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl || apiBaseUrl.trim() === '') {
  throw new Error(
    '[env] VITE_API_BASE_URL não definido. Configure o arquivo .env com a URL do backend.',
  );
}

export const appEnv = {
  appName:
    import.meta.env.VITE_APP_NAME ??
    'SEBRATEL - Gestão de Cobrança e Cancelamento',
  apiBaseUrl,
  // Client ID do Google OAuth (Google Cloud Console).
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
} as const satisfies {
  appName: string;
  apiBaseUrl: string;
  googleClientId: string;
};
