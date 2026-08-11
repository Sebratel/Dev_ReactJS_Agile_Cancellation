import { httpClient } from '@/services/api/http-client';
import { type PaginatedResponse } from '@/services/api/types/api-envelope';
import {
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserResponse,
  type UsersListParams,
} from '@/features/users/types/users-api.types';

function buildUsersPath(params: UsersListParams) {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page ?? 1));
  searchParams.set('limit', String(params.limit ?? 20));

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (params.role) {
    searchParams.set('role', params.role);
  }

  if (params.search && params.search.trim() !== '') {
    searchParams.set('search', params.search.trim());
  }

  return `/users?${searchParams.toString()}`;
}

export async function getUsers(params: UsersListParams = {}) {
  const response = await httpClient.request<PaginatedResponse<UserResponse>>({
    path: buildUsersPath(params),
  });

  return response.data;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await httpClient.request<UserResponse>({
    path: '/users',
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function updateUser(id: string, payload: UpdateUserPayload) {
  const response = await httpClient.request<UserResponse>({
    path: `/users/${id}`,
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function getUsersWorkload() {
  const response = await httpClient.request<Record<string, number>>({
    path: '/users/workload',
  });

  return response.data;
}

export { buildUsersPath };
