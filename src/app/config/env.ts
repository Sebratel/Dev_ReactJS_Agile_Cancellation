const apiBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl || apiBaseUrl.trim() === '') {
  throw new Error(
    '[env] VITE_API_BASE_URL não definido. Configure o arquivo .env com a URL do backend.',
  );
}

export const appEnv = {
  appName:
    import.meta.env.VITE_APP_NAME ?? 'GER - Gestão de Cobrança e Cancelamento',
  apiBaseUrl,
  // Client ID do Google OAuth (Google Cloud Console). Quando vazio, o login
  // usa o seletor de contas mock (dev local) em vez do botao real do Google.
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
} as const satisfies {
  appName: string;
  apiBaseUrl: string;
  googleClientId: string;
};
