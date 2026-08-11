process.env.NODE_ENV = 'test';
process.env.PRISMA_AUTO_CONNECT = 'false';
process.env.DATA_SOURCE_MODE = process.env.DATA_SOURCE_MODE ?? 'mock';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'ger-test-jwt-secret-do-not-use-in-production';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
process.env.GOOGLE_WORKSPACE_DOMAIN =
  process.env.GOOGLE_WORKSPACE_DOMAIN ?? 'sebratel.com.br';
// Forcado vazio de proposito: garante que o verificador MOCK do Google seja
// usado nos testes, mesmo que o .env local tenha um Client ID real configurado
// para teste manual (o factory usa o verificador real sempre que essa env
// estiver preenchida, independente de DATA_SOURCE_MODE).
process.env.GOOGLE_AUTH_MODE = 'mock';
process.env.GOOGLE_CLIENT_ID = '';
process.env.ELEVEN_MODE = process.env.ELEVEN_MODE ?? 'stub';
process.env.N8N_WEBHOOK_SECRET =
  process.env.N8N_WEBHOOK_SECRET ?? 'test-webhook-secret-1234567890';

jest.setTimeout(30_000);

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'mysql://USER:PASSWORD@HOST:3306/DB_Cancellation_Plataform?connection_limit=5';
}
