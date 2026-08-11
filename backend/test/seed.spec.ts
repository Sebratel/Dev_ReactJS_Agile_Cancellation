import {
  SEED_ADMIN_USER,
  SEED_FINANCE_USER,
  SEED_COLLECTION_CASE_DEFINITIONS,
  SEED_CONTRACT_DEFINITIONS,
  SEED_CUSTOMER_DEFINITIONS,
  SEED_DEMO_SCENARIO_CASES,
  SEED_INVOICE_DEFINITIONS,
  SEED_ROLE_DEFINITIONS,
  SEED_UNIQUE_KEYS,
} from '../prisma/seed/definitions';

describe('Seed de desenvolvimento', () => {
  it('define roles esperadas com codigos unicos', () => {
    const codes = SEED_ROLE_DEFINITIONS.map((role) => role.code);

    expect(codes).toEqual([
      'ADMIN',
      'SUPERVISOR',
      'COLLECTION_AGENT',
      'CANCELLATION_AGENT',
      'FINANCE',
      'VIEWER',
    ]);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('define usuario admin sem senha e com email unico', () => {
    expect(SEED_ADMIN_USER.email).toBe('admin@ger.local');
    expect(SEED_ADMIN_USER.name).toBe('Administrador GER');
    expect(SEED_ADMIN_USER.status).toBe('ACTIVE');
    expect(SEED_ADMIN_USER).not.toHaveProperty('password');
    expect(SEED_ADMIN_USER).not.toHaveProperty('passwordHash');
  });

  it('define usuario financeiro sem senha e com role FINANCE', () => {
    expect(SEED_FINANCE_USER.email).toBe('finance@ger.local');
    expect(SEED_FINANCE_USER.roleCode).toBe('FINANCE');
    expect(SEED_FINANCE_USER).not.toHaveProperty('password');
    expect(SEED_FINANCE_USER).not.toHaveProperty('passwordHash');
  });

  it('usa documentos ficticios para clientes', () => {
    const documents = SEED_CUSTOMER_DEFINITIONS.map(
      (customer) => customer.document,
    );

    expect(documents).toEqual([
      '00000000000',
      '11111111111',
      '22222222222',
      '33333333333',
      '44444444444',
    ]);
    expect(SEED_CUSTOMER_DEFINITIONS.length).toBeLessThanOrEqual(5);
  });

  it('mantem chaves unicas para upsert idempotente', () => {
    expect(new Set(SEED_UNIQUE_KEYS.roles).size).toBe(
      SEED_ROLE_DEFINITIONS.length,
    );
    expect(new Set(SEED_UNIQUE_KEYS.customers).size).toBe(
      SEED_CUSTOMER_DEFINITIONS.length,
    );
    expect(new Set(SEED_UNIQUE_KEYS.contracts).size).toBe(
      SEED_CONTRACT_DEFINITIONS.length,
    );
    expect(new Set(SEED_UNIQUE_KEYS.invoices).size).toBe(
      SEED_INVOICE_DEFINITIONS.length,
    );
    expect(new Set(SEED_UNIQUE_KEYS.collectionCases).size).toBe(
      SEED_COLLECTION_CASE_DEFINITIONS.length,
    );
  });

  it('usa externalId em entidades principais do seed', () => {
    for (const role of SEED_ROLE_DEFINITIONS) {
      expect(role.externalId.startsWith('seed-')).toBe(true);
    }

    for (const customer of SEED_CUSTOMER_DEFINITIONS) {
      expect(customer.externalId.startsWith('seed-')).toBe(true);
    }
  });

  it('define cenarios demonstraveis para reset demo', () => {
    expect(SEED_DEMO_SCENARIO_CASES.attemptReady).toBe('seed-case-001');
    expect(SEED_DEMO_SCENARIO_CASES.promiseReady).toBe('seed-case-002');
    expect(SEED_DEMO_SCENARIO_CASES.cancellationInProgress).toBe(
      'seed-case-003',
    );
    expect(SEED_DEMO_SCENARIO_CASES.sendToCancellationReady).toBe(
      'seed-case-004',
    );
    expect(SEED_DEMO_SCENARIO_CASES.cancellationCompleted).toBe(
      'seed-case-005',
    );
  });
});
