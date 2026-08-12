import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { useGoogleIdentityServices } from '@/features/auth/hooks/use-google-identity-services';

export function LoginForm() {
  const { loginWithGoogle, errorMessage, clearError } = useAuth();

  const { enabled, loadError, buttonContainerRef } = useGoogleIdentityServices(
    {
      onCredential: (idToken) => {
        clearError();
        void loginWithGoogle(idToken).catch(() => undefined);
      },
    },
  );

  useEffect(() => {
    return clearError;
  }, [clearError]);

  return (
    <div className="flex w-full flex-col gap-3">
      {enabled ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary p-1 shadow-[0_4px_18px_rgba(255,176,0,0.45),0_1px_4px_rgba(0,0,0,0.12)] transition-shadow duration-150 hover:shadow-[0_6px_22px_rgba(255,176,0,0.55),0_2px_6px_rgba(0,0,0,0.14)]">
            <div
              ref={buttonContainerRef}
              className="flex w-full justify-center"
            />
          </div>
          {loadError ? (
            <p className="text-xs text-danger" role="alert">
              {loadError}
            </p>
          ) : null}
        </div>
      ) : (
        <div
          className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-center"
          role="alert"
        >
          <p className="m-0 text-xs text-danger">
            Login Google nao configurado. Defina VITE_GOOGLE_CLIENT_ID no
            ambiente do frontend.
          </p>
        </div>
      )}

      {errorMessage ? (
        <div
          className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5"
          role="alert"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-danger"
            aria-hidden="true"
          />
          <p className="m-0 text-xs text-danger">{errorMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
