-- CreateTable
CREATE TABLE `bulk_contact_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `totalCount` INTEGER NOT NULL,
    `sentCount` INTEGER NOT NULL DEFAULT 0,
    `skippedCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,

    INDEX `bulk_contact_jobs_status_idx`(`status`),
    INDEX `bulk_contact_jobs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bulk_contact_job_items` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `collectionCaseId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'SKIPPED_STATUS', 'SKIPPED_PHONE', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `errorMessage` TEXT NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bulk_contact_job_items_jobId_status_idx`(`jobId`, `status`),
    UNIQUE INDEX `bulk_contact_job_items_jobId_collectionCaseId_key`(`jobId`, `collectionCaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bulk_contact_job_items` ADD CONSTRAINT `bulk_contact_job_items_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `bulk_contact_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
