import { SetMetadata } from '@nestjs/common';
import type { RoleCode } from '@/modules/auth/constants/role-codes.constants';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
