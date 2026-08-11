import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('Prisma schema', () => {
  const backendRoot = path.resolve(__dirname, '..');
  const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma');

  it('valida sem erros via prisma validate', () => {
    expect(() => {
      execFileSync('node', ['./scripts/prisma-validate.mjs'], {
        cwd: backendRoot,
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('define provider mysql', () => {
    const schema = fs.readFileSync(schemaPath, 'utf8');

    expect(schema).toMatch(/provider\s*=\s*"mysql"/);
  });

  it('define todos os models do dominio GER', () => {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const expectedModels = [
      'User',
      'Role',
      'UserRole',
      'Customer',
      'Contract',
      'Invoice',
      'CollectionCase',
      'CollectionAttempt',
      'PaymentPromise',
      'CancellationProcess',
      'CancellationStep',
      'AuditLog',
      'IntegrationEvent',
    ];

    for (const model of expectedModels) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\s+\\{`));
    }
  });

  it('define todos os enums do dominio GER', () => {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const expectedEnums = [
      'UserStatus',
      'ContractStatus',
      'InvoiceStatus',
      'CollectionStatus',
      'Priority',
      'AttemptChannel',
      'AttemptResult',
      'PaymentPromiseStatus',
      'CancellationStatus',
      'CancellationStepStatus',
      'AuditAction',
      'IntegrationEventStatus',
    ];

    for (const enumName of expectedEnums) {
      expect(schema).toMatch(new RegExp(`enum\\s+${enumName}\\s+\\{`));
    }
  });

  it('possui migration inicial versionada', () => {
    const migrationsDir = path.join(backendRoot, 'prisma', 'migrations');
    const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
    const migrationFolders = entries.filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.endsWith('_init_collection_cancellation_schema'),
    );

    expect(migrationFolders.length).toBeGreaterThan(0);
  });
});
