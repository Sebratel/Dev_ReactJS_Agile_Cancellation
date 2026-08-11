import type { RoleCode } from '@/modules/auth/constants/role-codes.constants';

export type MockAuthUserDefinition = {
  id: string;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'PENDING_ACTIVATION';
  roleCodes: RoleCode[];
};

export const MOCK_AUTH_USER_DEFINITIONS: MockAuthUserDefinition[] = [
  {
    id: 'user-admin',
    email: 'admin@ger.local',
    name: 'Ana Martins',
    status: 'ACTIVE',
    roleCodes: ['ADMIN'],
  },
  {
    id: 'user-supervisor',
    email: 'supervisor@ger.local',
    name: 'Paulo Nogueira',
    status: 'ACTIVE',
    roleCodes: ['SUPERVISOR'],
  },
  {
    id: 'user-collection',
    email: 'collection@ger.local',
    name: 'Marina Lopes',
    status: 'ACTIVE',
    roleCodes: ['COLLECTION_AGENT'],
  },
  {
    id: 'user-finance',
    email: 'finance@ger.local',
    name: 'Carla Mendes',
    status: 'ACTIVE',
    roleCodes: ['FINANCE'],
  },
  {
    id: 'user-cancellation',
    email: 'cancellation@ger.local',
    name: 'Rafael Costa',
    status: 'ACTIVE',
    roleCodes: ['CANCELLATION_AGENT'],
  },
  {
    id: 'user-viewer',
    email: 'viewer@ger.local',
    name: 'Luciana Freitas',
    status: 'ACTIVE',
    roleCodes: ['VIEWER'],
  },
  {
    id: 'user-inactive',
    email: 'inactive@ger.local',
    name: 'Usuario Inativo',
    status: 'INACTIVE',
    roleCodes: ['VIEWER'],
  },
];
