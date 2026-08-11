import { useEffect, useRef, useState } from 'react';
import { appEnv } from '@/app/config/env';
import '@/features/auth/types/google-identity.types';

const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_WORKSPACE_DOMAIN = 'sebratel.com.br';

let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts.id) {
    return Promise.resolve();
  }

  scriptLoadPromise ??= new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${GOOGLE_GSI_SCRIPT_SRC}"]`,
    );

    if (existing) {
      existing.addEventListener('load', () => {
        resolve();
      });
      existing.addEventListener('error', () => {
        reject(new Error('Falha ao carregar o script do Google.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Falha ao carregar o script do Google.'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

type UseGoogleIdentityServicesOptions = {
  onCredential: (idToken: string) => void;
};

/**
 * Carrega o Google Identity Services e renderiza o botao oficial "Entrar com
 * Google" dentro do elemento referenciado. So ativa quando VITE_GOOGLE_CLIENT_ID
 * esta configurado.
 */
export function useGoogleIdentityServices({
  onCredential,
}: UseGoogleIdentityServicesOptions) {
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  const clientId = appEnv.googleClientId;
  const enabled = clientId.trim() !== '';

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          hd: GOOGLE_WORKSPACE_DOMAIN,
          use_fedcm_for_button: true,
          callback: (response) => {
            onCredentialRef.current(response.credential);
          },
        });

        if (buttonContainerRef.current) {
          window.google.accounts.id.renderButton(buttonContainerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            width: 320,
          });
        }

        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(
            'NÃ£o foi possÃ­vel carregar o login do Google. Verifique sua conexÃ£o.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, enabled]);

  return { enabled, isReady, loadError, buttonContainerRef };
}
