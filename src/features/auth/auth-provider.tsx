import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
} from '@/features/auth/auth-context';
import {
  fetchCurrentUser,
  loginWithGoogle,
  logoutWithApi,
  restoreSessionFromRefresh,
} from '@/features/auth/auth.service';
import {
  clearStoredSession,
  persistSession,
  readStoredSession,
} from '@/features/auth/auth.storage';
import { type AuthSession } from '@/types/auth';
import {
  setAccessTokenGetter,
  setRefreshTokenGetter,
  setSessionTokensUpdater,
  setUnauthorizedHandler,
} from '@/services/api/auth-session-bridge';
import { ApiError } from '@/services/api/api-error';

type AuthAction =
  | { type: 'RESTORE_START' }
  | { type: 'RESTORE_SUCCESS'; payload: AuthSession | null }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: AuthSession }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  session: null,
  status: 'idle',
  errorMessage: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORE_START':
    case 'LOGIN_START':
      return {
        ...state,
        status: 'loading',
        errorMessage: null,
      };
    case 'RESTORE_SUCCESS':
      return {
        session: action.payload,
        status: action.payload ? 'authenticated' : 'unauthenticated',
        errorMessage: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        session: action.payload,
        status: 'authenticated',
        errorMessage: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        session: null,
        status: 'unauthenticated',
        errorMessage: action.payload,
      };
    case 'LOGOUT':
      return {
        session: null,
        status: 'unauthenticated',
        errorMessage: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        errorMessage: null,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const logout = useCallback(() => {
    const session = readStoredSession();

    if (session?.accessToken || session?.refreshToken) {
      void logoutWithApi({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      }).catch(() => undefined);
    }

    clearStoredSession();
    dispatch({ type: 'LOGOUT' });
  }, []);

  useEffect(() => {
    setAccessTokenGetter(() => readStoredSession()?.accessToken ?? null);
    setRefreshTokenGetter(() => readStoredSession()?.refreshToken ?? null);
    setSessionTokensUpdater(({ accessToken, refreshToken }) => {
      const currentSession = readStoredSession();

      if (!currentSession) {
        return;
      }

      persistSession({
        ...currentSession,
        accessToken,
        refreshToken,
      });
    });
    setUnauthorizedHandler(() => {
      clearStoredSession();
      dispatch({ type: 'LOGOUT' });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      dispatch({ type: 'RESTORE_START' });
      const storedSession = readStoredSession();

      if (!storedSession?.accessToken && !storedSession?.refreshToken) {
        if (!cancelled) {
          dispatch({ type: 'RESTORE_SUCCESS', payload: null });
        }
        return;
      }

      try {
        let session: AuthSession | null = null;

        if (storedSession.accessToken) {
          try {
            session = await fetchCurrentUser(storedSession.accessToken);
          } catch (error) {
            if (
              error instanceof ApiError &&
              error.status === 401 &&
              storedSession.refreshToken
            ) {
              session = await restoreSessionFromRefresh(storedSession);
            } else {
              throw error;
            }
          }
        } else if (storedSession.refreshToken) {
          session = await restoreSessionFromRefresh(storedSession);
        }

        if (!cancelled) {
          if (session) {
            persistSession(session);
            dispatch({ type: 'RESTORE_SUCCESS', payload: session });
          } else {
            clearStoredSession();
            dispatch({ type: 'RESTORE_SUCCESS', payload: null });
          }
        }
      } catch {
        if (!cancelled) {
          clearStoredSession();
          dispatch({ type: 'RESTORE_SUCCESS', payload: null });
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithGoogleCredential = useCallback(async (idToken: string) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const session = await loginWithGoogle(idToken);
      persistSession(session);
      dispatch({ type: 'LOGIN_SUCCESS', payload: session });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha inesperada ao autenticar usuário.';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loginWithGoogle: loginWithGoogleCredential,
      logout,
      clearError,
    }),
    [clearError, loginWithGoogleCredential, logout, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
