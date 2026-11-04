// Seed minimo de usuarios do teste de carga (roda DENTRO do container do backend, apos o
// `prisma migrate deploy` do proprio start). Imprime em stdout um JSON com usuarios + refresh tokens.
// Dados sinteticos; os "segredos" gerados valem so para este ambiente descartavel.
//   docker compose exec -T backend node /loadtest/seed-users.cjs
const appRequire = require('node:module').createRequire('/app/package.json');
const { PrismaClient } = appRequire('@prisma/client');
const argon2 = appRequire('argon2');
const { randomBytes } = require('node:crypto');

const ROLES = [
  ['ADMIN', 'Administrador'],
  ['SUPERVISOR', 'Supervisor'],
  ['COLLECTION_AGENT', 'Agente de Cobranca'],
  ['CANCELLATION_AGENT', 'Agente de Cancelamento'],
  ['FINANCE', 'Financeiro'],
  ['VIEWER', 'Visualizador'],
];

// 1 admin, 2 supervisores, 12 agentes de cobranca, 3 de cancelamento
const USERS = [
  ['lt-admin-01', 'ADMIN'],
  ['lt-sup-01', 'SUPERVISOR'],
  ['lt-sup-02', 'SUPERVISOR'],
  ...Array.from({ length: 12 }, (_, i) => [
    `lt-agent-${String(i + 1).padStart(2, '0')}`,
    'COLLECTION_AGENT',
  ]),
  ...Array.from({ length: 3 }, (_, i) => [
    `lt-cancel-${String(i + 1).padStart(2, '0')}`,
    'CANCELLATION_AGENT',
  ]),
];

async function main() {
  const prisma = new PrismaClient();
  try {
    const roleIds = {};
    for (const [code, name] of ROLES) {
      const role = await prisma.role.upsert({
        where: { code },
        update: {},
        create: { code, name, externalId: `lt-role-${code}` },
      });
      roleIds[code] = role.id;
    }

    const out = [];
    for (const [key, roleCode] of USERS) {
      const email = `${key}@loadtest.invalid`;
      const refreshToken = `PLACEHOLDER-${key}-${randomBytes(24).toString('base64url')}`;
      const user = await prisma.user.upsert({
        where: { email },
        update: { status: 'ACTIVE' },
        create: {
          email,
          name: `Load Test ${key}`,
          status: 'ACTIVE',
          externalId: key,
        },
      });
      // refresh token = `${userId}:${segredo}` e hash argon2 (mesmo formato do AuthService)
      const token = `${user.id}:${refreshToken}`;
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: await argon2.hash(token) },
      });
      await prisma.userRole.upsert({
        where: {
          userId_roleId: { userId: user.id, roleId: roleIds[roleCode] },
        },
        update: {},
        create: { userId: user.id, roleId: roleIds[roleCode] },
      });
      out.push({ id: user.id, email, role: roleCode, refreshToken: token });
    }
    process.stdout.write(JSON.stringify(out));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  process.stderr.write(`seed falhou: ${e && e.message}\n`);
  process.exit(1);
});
