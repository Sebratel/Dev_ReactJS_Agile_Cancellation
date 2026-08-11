export const SEED_ROLE_DEFINITIONS = [
  {
    externalId: 'seed-role-admin',
    code: 'ADMIN',
    name: 'Administrador',
    description: 'Acesso total ao sistema GER.',
  },
  {
    externalId: 'seed-role-supervisor',
    code: 'SUPERVISOR',
    name: 'Supervisor',
    description: 'Supervisao operacional de cobranca e cancelamento.',
  },
  {
    externalId: 'seed-role-collection-agent',
    code: 'COLLECTION_AGENT',
    name: 'Agente de Cobranca',
    description: 'Tratativa de casos de cobranca.',
  },
  {
    externalId: 'seed-role-cancellation-agent',
    code: 'CANCELLATION_AGENT',
    name: 'Agente de Cancelamento',
    description: 'Tratativa de processos de cancelamento.',
  },
  {
    externalId: 'seed-role-finance',
    code: 'FINANCE',
    name: 'Financeiro',
    description: 'Baixa de titulos e aplicacao de multa em cancelamentos.',
  },
  {
    externalId: 'seed-role-viewer',
    code: 'VIEWER',
    name: 'Visualizador',
    description: 'Acesso somente leitura.',
  },
] as const;

export const SEED_ADMIN_USER = {
  externalId: 'seed-user-admin',
  email: 'admin@ger.local',
  name: 'Administrador GER',
  status: 'ACTIVE' as const,
  roleCode: 'ADMIN',
};

export const SEED_FINANCE_USER = {
  externalId: 'seed-user-finance',
  email: 'finance@ger.local',
  name: 'Carla Mendes',
  status: 'ACTIVE' as const,
  roleCode: 'FINANCE',
};

export const SEED_CUSTOMER_DEFINITIONS = [
  {
    externalId: 'seed-customer-alpha',
    name: 'Empresa Alpha Ltda',
    document: '00000000000',
    email: 'contato@alpha-ficticio.local',
    phone: '(11) 4000-0001',
  },
  {
    externalId: 'seed-customer-beta',
    name: 'Comercio Beta SA',
    document: '11111111111',
    email: 'financeiro@beta-ficticio.local',
    phone: '(11) 4000-0002',
  },
  {
    externalId: 'seed-customer-gamma',
    name: 'Servicos Gamma ME',
    document: '22222222222',
    email: 'cobranca@gamma-ficticio.local',
    phone: '(11) 4000-0003',
  },
  {
    externalId: 'seed-customer-delta',
    name: 'Industria Delta Ltda',
    document: '33333333333',
    email: 'ap@delta-ficticio.local',
    phone: '(11) 4000-0004',
  },
  {
    externalId: 'seed-customer-epsilon',
    name: 'Clinica Epsilon',
    document: '44444444444',
    email: 'administrativo@epsilon-ficticio.local',
    phone: '(11) 4000-0005',
  },
] as const;

export const SEED_CONTRACT_DEFINITIONS = [
  {
    externalId: 'seed-contract-001',
    customerExternalId: 'seed-customer-alpha',
    code: 'CTR-SEED-001',
    status: 'ACTIVE' as const,
    totalValue: '12500.00',
    startDate: '2024-01-15T00:00:00.000Z',
  },
  {
    externalId: 'seed-contract-002',
    customerExternalId: 'seed-customer-beta',
    code: 'CTR-SEED-002',
    status: 'ACTIVE' as const,
    totalValue: '9800.50',
    startDate: '2024-02-01T00:00:00.000Z',
  },
  {
    externalId: 'seed-contract-003',
    customerExternalId: 'seed-customer-gamma',
    code: 'CTR-SEED-003',
    status: 'ACTIVE' as const,
    totalValue: '15420.75',
    startDate: '2024-03-10T00:00:00.000Z',
  },
  {
    externalId: 'seed-contract-004',
    customerExternalId: 'seed-customer-delta',
    code: 'CTR-SEED-004',
    status: 'SUSPENDED' as const,
    totalValue: '22100.00',
    startDate: '2023-11-20T00:00:00.000Z',
  },
  {
    externalId: 'seed-contract-005',
    customerExternalId: 'seed-customer-epsilon',
    code: 'CTR-SEED-005',
    status: 'ACTIVE' as const,
    totalValue: '8750.25',
    startDate: '2024-04-05T00:00:00.000Z',
  },
] as const;

export const SEED_INVOICE_DEFINITIONS = [
  {
    externalId: 'seed-invoice-001',
    contractExternalId: 'seed-contract-001',
    invoiceNumber: 'NF-SEED-001',
    status: 'OVERDUE' as const,
    dueDate: '2025-12-10T00:00:00.000Z',
    amount: '4200.00',
    paidAmount: '0.00',
  },
  {
    externalId: 'seed-invoice-002',
    contractExternalId: 'seed-contract-002',
    invoiceNumber: 'NF-SEED-002',
    status: 'OPEN' as const,
    dueDate: '2026-02-15T00:00:00.000Z',
    amount: '3100.50',
    paidAmount: '0.00',
  },
  {
    externalId: 'seed-invoice-003',
    contractExternalId: 'seed-contract-003',
    invoiceNumber: 'NF-SEED-003',
    status: 'OVERDUE' as const,
    dueDate: '2025-11-01T00:00:00.000Z',
    amount: '5140.75',
    paidAmount: '1000.00',
  },
  {
    externalId: 'seed-invoice-004',
    contractExternalId: 'seed-contract-004',
    invoiceNumber: 'NF-SEED-004',
    status: 'OVERDUE' as const,
    dueDate: '2025-10-20T00:00:00.000Z',
    amount: '7800.00',
    paidAmount: '0.00',
  },
  {
    externalId: 'seed-invoice-005',
    contractExternalId: 'seed-contract-005',
    invoiceNumber: 'NF-SEED-005',
    status: 'OPEN' as const,
    dueDate: '2026-03-01T00:00:00.000Z',
    amount: '2910.25',
    paidAmount: '0.00',
  },
] as const;

export const SEED_COLLECTION_CASE_DEFINITIONS = [
  {
    externalId: 'seed-case-001',
    contractExternalId: 'seed-contract-001',
    customerExternalId: 'seed-customer-alpha',
    status: 'IN_COLLECTION' as const,
    priority: 'HIGH' as const,
    outstandingAmount: '4200.00',
    daysOverdue: 89,
  },
  {
    externalId: 'seed-case-002',
    contractExternalId: 'seed-contract-002',
    customerExternalId: 'seed-customer-beta',
    status: 'WAITING_TRIAGE' as const,
    priority: 'MEDIUM' as const,
    outstandingAmount: '3100.50',
    daysOverdue: 12,
  },
  {
    externalId: 'seed-case-003',
    contractExternalId: 'seed-contract-003',
    customerExternalId: 'seed-customer-gamma',
    status: 'NO_RESPONSE' as const,
    priority: 'HIGH' as const,
    outstandingAmount: '4140.75',
    daysOverdue: 128,
  },
  {
    externalId: 'seed-case-004',
    contractExternalId: 'seed-contract-004',
    customerExternalId: 'seed-customer-delta',
    status: 'ELIGIBLE_FOR_CANCELLATION' as const,
    priority: 'CRITICAL' as const,
    outstandingAmount: '7800.00',
    daysOverdue: 141,
  },
  {
    externalId: 'seed-case-005',
    contractExternalId: 'seed-contract-005',
    customerExternalId: 'seed-customer-epsilon',
    status: 'AWAITING_PAYMENT' as const,
    priority: 'LOW' as const,
    outstandingAmount: '2910.25',
    daysOverdue: 0,
  },
] as const;

export const SEED_DEMO_SCENARIO_CASES = {
  attemptReady: 'seed-case-001',
  promiseReady: 'seed-case-002',
  cancellationInProgress: 'seed-case-003',
  sendToCancellationReady: 'seed-case-004',
  cancellationCompleted: 'seed-case-005',
} as const;

export const SEED_UNIQUE_KEYS = {
  roles: SEED_ROLE_DEFINITIONS.map((role) => role.code),
  users: [SEED_ADMIN_USER.email, SEED_FINANCE_USER.email],
  customers: SEED_CUSTOMER_DEFINITIONS.map((customer) => customer.document),
  contracts: SEED_CONTRACT_DEFINITIONS.map((contract) => contract.code),
  invoices: SEED_INVOICE_DEFINITIONS.map((invoice) => invoice.externalId),
  collectionCases: SEED_COLLECTION_CASE_DEFINITIONS.map(
    (collectionCase) => collectionCase.externalId,
  ),
} as const;
