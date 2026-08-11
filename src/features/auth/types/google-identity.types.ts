export type GoogleCredentialResponse = {
  credential: string;
};

export type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  hd?: string;
  auto_select?: boolean;
  // Usa o fluxo FedCM em vez do popup legado baseado em postMessage/cookies
  // de terceiros — sem isso, navegadores que bloqueiam cookies de terceiros
  // fecham o popup silenciosamente sem entregar a credencial.
  use_fedcm_for_button?: boolean;
};

export type GoogleButtonConfiguration = {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  logo_alignment?: 'left' | 'center';
  width?: number;
};

export type GoogleAccountsId = {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (
    parent: HTMLElement,
    options: GoogleButtonConfiguration,
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}
