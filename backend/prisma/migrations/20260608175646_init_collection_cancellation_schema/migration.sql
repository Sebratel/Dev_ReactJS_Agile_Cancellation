-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING_ACTIVATION') NOT NULL DEFAULT 'ACTIVE',
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_externalId_key`(`externalId`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_code_key`(`code`),
    UNIQUE INDEX `roles_externalId_key`(`externalId`),
    INDEX `roles_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_roleId_idx`(`roleId`),
    UNIQUE INDEX `user_roles_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `document` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customers_document_key`(`document`),
    UNIQUE INDEX `customers_externalId_key`(`externalId`),
    INDEX `customers_name_idx`(`name`),
    INDEX `customers_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contracts` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'TERMINATED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `totalValue` DECIMAL(15, 2) NULL,
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contracts_code_key`(`code`),
    UNIQUE INDEX `contracts_externalId_key`(`externalId`),
    INDEX `contracts_customerId_idx`(`customerId`),
    INDEX `contracts_status_idx`(`status`),
    INDEX `contracts_startDate_idx`(`startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `contractId` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'OPEN', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF') NOT NULL DEFAULT 'OPEN',
    `dueDate` DATETIME(3) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `paidAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_externalId_key`(`externalId`),
    INDEX `invoices_contractId_idx`(`contractId`),
    INDEX `invoices_status_idx`(`status`),
    INDEX `invoices_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collection_cases` (
    `id` VARCHAR(191) NOT NULL,
    `contractId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `assignedUserId` VARCHAR(191) NULL,
    `status` ENUM('WAITING_TRIAGE', 'IN_COLLECTION', 'AWAITING_PAYMENT', 'NO_RESPONSE', 'ELIGIBLE_FOR_CANCELLATION', 'CANCELLATION_IN_PROGRESS', 'CLOSED', 'RECOVERED') NOT NULL DEFAULT 'WAITING_TRIAGE',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `outstandingAmount` DECIMAL(15, 2) NOT NULL,
    `daysOverdue` INTEGER NOT NULL DEFAULT 0,
    `externalId` VARCHAR(191) NULL,
    `slaDueAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `collection_cases_externalId_key`(`externalId`),
    INDEX `collection_cases_contractId_idx`(`contractId`),
    INDEX `collection_cases_customerId_idx`(`customerId`),
    INDEX `collection_cases_assignedUserId_idx`(`assignedUserId`),
    INDEX `collection_cases_status_idx`(`status`),
    INDEX `collection_cases_priority_idx`(`priority`),
    INDEX `collection_cases_daysOverdue_idx`(`daysOverdue`),
    INDEX `collection_cases_slaDueAt_idx`(`slaDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collection_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `collectionCaseId` VARCHAR(191) NOT NULL,
    `performedByUserId` VARCHAR(191) NULL,
    `channel` ENUM('PHONE', 'EMAIL', 'SMS', 'WHATSAPP', 'LETTER', 'IN_PERSON', 'OTHER') NOT NULL,
    `result` ENUM('CONTACTED', 'NO_ANSWER', 'VOICEMAIL', 'PROMISE_MADE', 'REFUSED', 'WRONG_NUMBER', 'CALLBACK_REQUESTED', 'OTHER') NOT NULL,
    `attemptedAt` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `collection_attempts_externalId_key`(`externalId`),
    INDEX `collection_attempts_collectionCaseId_idx`(`collectionCaseId`),
    INDEX `collection_attempts_performedByUserId_idx`(`performedByUserId`),
    INDEX `collection_attempts_attemptedAt_idx`(`attemptedAt`),
    INDEX `collection_attempts_channel_idx`(`channel`),
    INDEX `collection_attempts_result_idx`(`result`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_promises` (
    `id` VARCHAR(191) NOT NULL,
    `collectionCaseId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'FULFILLED', 'BROKEN', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `promisedAmount` DECIMAL(15, 2) NOT NULL,
    `promisedDate` DATETIME(3) NOT NULL,
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_promises_externalId_key`(`externalId`),
    INDEX `payment_promises_collectionCaseId_idx`(`collectionCaseId`),
    INDEX `payment_promises_status_idx`(`status`),
    INDEX `payment_promises_promisedDate_idx`(`promisedDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cancellation_processes` (
    `id` VARCHAR(191) NOT NULL,
    `collectionCaseId` VARCHAR(191) NULL,
    `contractId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'AWAITING_PROTOCOL', 'AWAITING_PICKUP', 'COMPLETED', 'CANCELLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `externalId` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cancellation_processes_externalId_key`(`externalId`),
    INDEX `cancellation_processes_collectionCaseId_idx`(`collectionCaseId`),
    INDEX `cancellation_processes_contractId_idx`(`contractId`),
    INDEX `cancellation_processes_customerId_idx`(`customerId`),
    INDEX `cancellation_processes_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cancellation_steps` (
    `id` VARCHAR(191) NOT NULL,
    `cancellationProcessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `stepOrder` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `completedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cancellation_steps_externalId_key`(`externalId`),
    INDEX `cancellation_steps_cancellationProcessId_idx`(`cancellationProcessId`),
    INDEX `cancellation_steps_status_idx`(`status`),
    INDEX `cancellation_steps_stepOrder_idx`(`stepOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'INTEGRATION') NOT NULL,
    `performedByUserId` VARCHAR(191) NULL,
    `beforeSnapshot` JSON NULL,
    `afterSnapshot` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `audit_logs_performedByUserId_idx`(`performedByUserId`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `integration_events` (
    `id` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'DISCARDED') NOT NULL DEFAULT 'PENDING',
    `payload` JSON NULL,
    `errorMessage` TEXT NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `integration_events_externalId_key`(`externalId`),
    INDEX `integration_events_source_idx`(`source`),
    INDEX `integration_events_eventType_idx`(`eventType`),
    INDEX `integration_events_status_idx`(`status`),
    INDEX `integration_events_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_cases` ADD CONSTRAINT `collection_cases_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_cases` ADD CONSTRAINT `collection_cases_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_cases` ADD CONSTRAINT `collection_cases_assignedUserId_fkey` FOREIGN KEY (`assignedUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_attempts` ADD CONSTRAINT `collection_attempts_collectionCaseId_fkey` FOREIGN KEY (`collectionCaseId`) REFERENCES `collection_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_attempts` ADD CONSTRAINT `collection_attempts_performedByUserId_fkey` FOREIGN KEY (`performedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_promises` ADD CONSTRAINT `payment_promises_collectionCaseId_fkey` FOREIGN KEY (`collectionCaseId`) REFERENCES `collection_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cancellation_processes` ADD CONSTRAINT `cancellation_processes_collectionCaseId_fkey` FOREIGN KEY (`collectionCaseId`) REFERENCES `collection_cases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cancellation_processes` ADD CONSTRAINT `cancellation_processes_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cancellation_processes` ADD CONSTRAINT `cancellation_processes_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cancellation_steps` ADD CONSTRAINT `cancellation_steps_cancellationProcessId_fkey` FOREIGN KEY (`cancellationProcessId`) REFERENCES `cancellation_processes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_performedByUserId_fkey` FOREIGN KEY (`performedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

