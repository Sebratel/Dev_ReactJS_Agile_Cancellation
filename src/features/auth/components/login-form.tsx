import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { useGoogleIdentityServices } from '@/features/auth/hooks/use-google-identity-services';

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="rgb(255,193,7)"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
        c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
        c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="rgb(255,61,0)"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039
        l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="rgb(76,175,80)"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
        c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="rgb(25,118,210)"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
        c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

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
          <div className="relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-primary text-sm font-bold text-login-ink shadow-[0_4px_18px_rgba(255,176,0,0.45),0_1px_4px_rgba(0,0,0,0.12)] transition-shadow duration-150 hover:shadow-[0_6px_22px_rgba(255,176,0,0.55),0_2px_6px_rgba(0,0,0,0.14)]">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white"
              aria-hidden="true"
            >
              <GoogleLogo />
            </span>
            <span aria-hidden="true">Entrar com Google</span>
            <div
              ref={buttonContainerRef}
              className="absolute inset-0 opacity-0"
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
