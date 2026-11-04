import {
  PrismaClient,
  type CollectionStatus,
  type ContractStatus,
  type InvoiceStatus,
  type Priority,
  type UserStatus,
} from '@prisma/client';
import {
  SEED_ADMIN_USER,
  SEED_FINANCE_USER,
  SEED_COLLECTION_CASE_DEFINITIONS,
  SEED_CONTRACT_DEFINITIONS,
  SEED_CUSTOMER_DEFINITIONS,
  SEED_INVOICE_DEFINITIONS,
  SEED_ROLE_DEFINITIONS,
} from './definitions';
import { seedDemoScenarios } from './seed-demo-scenarios';

type IdMap = Record<string, string>;

export async function runDevelopmentSeed(prisma: PrismaClient): Promise<void> {
  const roleIds = await seedRoles(prisma);
  const adminUserId = await seedUser(prisma, roleIds, SEED_ADMIN_USER);
  await seedUser(prisma, roleIds, SEED_FINANCE_USER);
  const customerIds = await seedCustomers(prisma);
  const contractIds = await seedContracts(prisma, customerIds);
  await seedInvoices(prisma, contractIds);
  await seedCollectionCases(prisma, {
    adminUserId,
    contractIds,
    customerIds,
  });

  await seedDemoScenarios(prisma, {
    adminUserId,
    financeUserName: SEED_FINANCE_USER.name,
  });
}

async function seedRoles(prisma: PrismaClient): Promise<IdMap> {
  const roleIds: IdMap = {};

  for (const role of SEED_ROLE_DEFINITIONS) {
    const record = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        externalId: role.externalId,
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        externalId: role.externalId,
      },
    });

    roleIds[role.code] = record.id;
  }

  return roleIds;
}

type SeedUserDefinition = {
  externalId: string;
  email: string;
  name: string;
  status: 'ACTIVE';
  roleCode: string;
};

async function seedUser(
  prisma: PrismaClient,
  roleIds: IdMap,
  user: SeedUserDefinition,
): Promise<string> {
  const roleId = roleIds[user.roleCode];

  if (!roleId) {
    throw new Error(
      `Role ${user.roleCode} nao encontrada para seed do usuario ${user.email}.`,
    );
  }

  const record = await prisma.user.upsert({
    where: { email: user.email },
    update: {
      name: user.name,
      status: user.status as UserStatus,
      externalId: user.externalId,
    },
    create: {
      email: user.email,
      name: user.name,
      status: user.status as UserStatus,
      externalId: user.externalId,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: record.id,
        roleId,
      },
    },
    update: {},
    create: {
      userId: record.id,
      roleId,
    },
  });

  return record.id;
}

async function seedCustomers(prisma: PrismaClient): Promise<IdMap> {
  const customerIds: IdMap = {};

  for (const customer of SEED_CUSTOMER_DEFINITIONS) {
    const record = await prisma.customer.upsert({
      where: { document: customer.document },
      update: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        externalId: customer.externalId,
      },
      create: {
        document: customer.document,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        externalId: customer.externalId,
      },
    });

    customerIds[customer.externalId] = record.id;
  }

  return customerIds;
}

async function seedContracts(
  prisma: PrismaClient,
  customerIds: IdMap,
): Promise<IdMap> {
  const contractIds: IdMap = {};

  for (const contract of SEED_CONTRACT_DEFINITIONS) {
    const customerId = customerIds[contract.customerExternalId];

    if (!customerId) {
      throw new Error(
        `Cliente ${contract.customerExternalId} nao encontrado para seed de contrato.`,
      );
    }

    const record = await prisma.contract.upsert({
      where: { code: contract.code },
      update: {
        customerId,
        status: contract.status as ContractStatus,
        totalValue: contract.totalValue,
        startDate: new Date(contract.startDate),
        externalId: contract.externalId,
      },
      create: {
        customerId,
        code: contract.code,
        status: contract.status as ContractStatus,
        totalValue: contract.totalValue,
        startDate: new Date(contract.startDate),
        externalId: contract.externalId,
      },
    });

    contractIds[contract.externalId] = record.id;
  }

  return contractIds;
}

async function seedInvoices(
  prisma: PrismaClient,
  contractIds: IdMap,
): Promise<void> {
  for (const invoice of SEED_INVOICE_DEFINITIONS) {
    const contractId = contractIds[invoice.contractExternalId];

    if (!contractId) {
      throw new Error(
        `Contrato ${invoice.contractExternalId} nao encontrado para seed de fatura.`,
      );
    }

    await prisma.invoice.upsert({
      where: { externalId: invoice.externalId },
      update: {
        contractId,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status as InvoiceStatus,
        dueDate: new Date(invoice.dueDate),
        amount: invoice.amount,
        paidAmount: invoice.paidAmount,
      },
      create: {
        contractId,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status as InvoiceStatus,
        dueDate: new Date(invoice.dueDate),
        amount: invoice.amount,
        paidAmount: invoice.paidAmount,
        externalId: invoice.externalId,
      },
    });
  }
}

async function seedCollectionCases(
  prisma: PrismaClient,
  context: {
    adminUserId: string;
    contractIds: IdMap;
    customerIds: IdMap;
  },
): Promise<void> {
  for (const collectionCase of SEED_COLLECTION_CASE_DEFINITIONS) {
    const contractId = context.contractIds[collectionCase.contractExternalId];
    const customerId = context.customerIds[collectionCase.customerExternalId];

    if (!contractId || !customerId) {
      throw new Error(
        `Referencias invalidas para seed do caso ${collectionCase.externalId}.`,
      );
    }

    const existingSeedCase = await prisma.collectionCase.findUnique({
      where: { externalId: collectionCase.externalId },
      select: { id: true },
    });

    const createdCase = await prisma.collectionCase.upsert({
      where: { externalId: collectionCase.externalId },
      update: {
        contractId,
        customerId,
        assignedUserId: context.adminUserId,
        status: collectionCase.status as CollectionStatus,
        priority: collectionCase.priority as Priority,
        outstandingAmount: collectionCase.outstandingAmount,
        daysOverdue: collectionCase.daysOverdue,
      },
      create: {
        contractId,
        customerId,
        assignedUserId: context.adminUserId,
        status: collectionCase.status as CollectionStatus,
        priority: collectionCase.priority as Priority,
        outstandingAmount: collectionCase.outstandingAmount,
        daysOverdue: collectionCase.daysOverdue,
        externalId: collectionCase.externalId,
      },
    });

    // Tentativa inicial automatica: criada apenas uma vez por caso.
    if (!existingSeedCase) {
      await prisma.collectionAttempt.create({
        data: {
          collectionCaseId: createdCase.id,
          performedByUserId: null,
          channel: 'WHATSAPP',
          result: 'NO_ANSWER',
          notes:
            'Mensagem automática enviada ao cliente antes da entrada na plataforma.',
          attemptedAt: createdCase.createdAt,
          isAutomatic: true,
        },
      });
    }
  }
}
