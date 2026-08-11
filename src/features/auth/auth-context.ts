import { createContext, useContext } from 'react';
import { type AuthSession, type AuthStatus } from '@/types/auth';

export type AuthState = {
  session: AuthSession | null;
  status: AuthStatus;
  errorMessage: string | null;
};

export type AuthContextValue = AuthState & {
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }

  return context;
}
