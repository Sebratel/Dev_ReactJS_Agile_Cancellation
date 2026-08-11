import {
  BarChart3,
  BellRing,
  BookUser,
  Building2,
  ClipboardList,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldAlert,
  Trophy,
  UserCog,
  Users,
} from 'lucide-react';
import { type UserRole } from '@/types/auth';

export type AppRouteItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  shortTitle: string;
  allowedRoles: UserRole[];
  ready: boolean;
  group: 'operacao' | 'gestao';
};

export const appRoutes: AppRouteItem[] = [
  {
    label: 'Visão geral',
    path: '/dashboard',
    shortTitle: 'Dashboard',
    icon: LayoutDashboard,
    allowedRoles: [
      'ADMIN',
      'SUPERVISOR',
      'COLLECTION_AGENT',
      'CANCELLATION_AGENT',
      'VIEWER',
    ],
    ready: true,
    group: 'operacao',
  },
  {
    label: 'Supervisão',
    path: '/supervisao',
    shortTitle: 'Supervisão',
    icon: Users,
    allowedRoles: ['ADMIN', 'SUPERVISOR'],
    ready: true,
    group: 'operacao',
  },
  {
    label: 'Clientes',
    path: '/clientes',
    shortTitle: 'Clientes',
    icon: Building2,
    allowedRoles: ['ADMIN', 'SUPERVISOR', 'FINANCE'],
    ready: true,
    group: 'operacao',
  },
  {
    label: 'Minha cobrança',
    path: '/minha-cobranca',
    shortTitle: 'Cobrança',
    icon: BookUser,
    allowedRoles: ['ADMIN', 'COLLECTION_AGENT'],
    ready: true,
    group: 'operacao',
  },
  {
    label: 'Cobrança',
    path: '/backlog',
    shortTitle: 'Cobrança',
    icon: ClipboardList,
    allowedRoles: ['ADMIN', 'SUPERVISOR'],
    ready: true,
    group: 'operacao',
  },
  {
    label: 'Promessas',
    path: '/promessas',
    shortTitle: 'Promessas',
    icon: BellRing,
    allowedRoles: ['ADMIN', 'SUPERVISOR'],
    ready: true,
    group: 'operacao',
  },
  {
    label: 'Cancelamentos',
    path: '/cancelamentos',
    shortTitle: 'Cancelamentos',
    icon: ShieldAlert,
    allowedRoles: ['ADMIN', 'SUPERVISOR', 'CANCELLATION_AGENT'],
    ready: true,
    group: 'operacao',
  },
  {
    label: 'Relatórios',
    path: '/relatorios',
    shortTitle: 'Relatórios',
    icon: BarChart3,
    allowedRoles: ['ADMIN', 'SUPERVISOR', 'VIEWER'],
    ready: true,
    group: 'operacao',
  },
  {
    label: 'Ranking de recuperação',
    path: '/ranking',
    shortTitle: 'Ranking',
    icon: Trophy,
    allowedRoles: ['ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT'],
    ready: true,
    group: 'gestao',
  },
  {
    label: 'Auditoria',
    path: '/auditoria',
    shortTitle: 'Auditoria',
    icon: ScrollText,
    allowedRoles: ['ADMIN', 'SUPERVISOR'],
    ready: true,
    group: 'gestao',
  },
  {
    label: 'Usuários',
    path: '/usuarios',
    shortTitle: 'Usuários',
    icon: UserCog,
    allowedRoles: ['ADMIN'],
    ready: true,
    group: 'gestao',
  },
  {
    label: 'Configurações',
    path: '/configuracoes',
    shortTitle: 'Configurações',
    icon: Settings,
    allowedRoles: ['ADMIN'],
    ready: true,
    group: 'gestao',
  },
];
