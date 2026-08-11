import { type UserRole } from '@/types/auth';

export type MockGoogleAccount = {
  email: string;
  name: string;
  role: UserRole;
};

/**
 * Espelha os usuarios mock do backend (MOCK_AUTH_USER_DEFINITIONS) para o
 * seletor de contas exibido no login quando VITE_GOOGLE_CLIENT_ID nao esta
 * configurado (dev local sem Client ID real do Google ainda).
 */
export const MOCK_GOOGLE_ACCOUNTS: MockGoogleAccount[] = [
  { email: 'admin@ger.local', name: 'Ana Martins', role: 'ADMIN' },
  { email: 'supervisor@ger.local', name: 'Paulo Nogueira', role: 'SUPERVISOR' },
  {
    email: 'collection@ger.local',
    name: 'Marina Lopes',
    role: 'COLLECTION_AGENT',
  },
  { email: 'finance@ger.local', name: 'Carla Mendes', role: 'FINANCE' },
  {
    email: 'cancellation@ger.local',
    name: 'Rafael Costa',
    role: 'CANCELLATION_AGENT',
  },
  { email: 'viewer@ger.local', name: 'Luciana Freitas', role: 'VIEWER' },
];
