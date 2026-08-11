import request from 'supertest';
import type { LoginResponse } from '@/modules/auth/dto/auth.response';

type ApiEnvelope<TData> = {
  data: TData;
  timestamp: string;
};

export function authHeader(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function mockGoogleIdToken(email: string) {
  return `mock:${email}`;
}

export async function loginTestUser(
  httpServer: Parameters<typeof request>[0],
  email: string,
) {
  const response = await request(httpServer)
    .post('/auth/google')
    .send({ idToken: mockGoogleIdToken(email) })
    .expect(201);

  const body = response.body as ApiEnvelope<LoginResponse>;

  return body.data;
}

export async function loginAsAdmin(httpServer: Parameters<typeof request>[0]) {
  return loginTestUser(httpServer, 'admin@ger.local');
}

export async function loginAsCollectionAgent(
  httpServer: Parameters<typeof request>[0],
) {
  return loginTestUser(httpServer, 'collection@ger.local');
}

export async function loginAsSupervisor(
  httpServer: Parameters<typeof request>[0],
) {
  return loginTestUser(httpServer, 'supervisor@ger.local');
}

export async function loginAsCancellationAgent(
  httpServer: Parameters<typeof request>[0],
) {
  return loginTestUser(httpServer, 'cancellation@ger.local');
}

export async function loginAsFinance(
  httpServer: Parameters<typeof request>[0],
) {
  return loginTestUser(httpServer, 'finance@ger.local');
}

export async function loginAsViewer(httpServer: Parameters<typeof request>[0]) {
  return loginTestUser(httpServer, 'viewer@ger.local');
}

export async function loginSeededAdmin(
  httpServer: Parameters<typeof request>[0],
) {
  return loginTestUser(httpServer, 'admin@ger.local');
}

export async function loginSeededFinance(
  httpServer: Parameters<typeof request>[0],
) {
  return loginTestUser(httpServer, 'finance@ger.local');
}
