-- AlterTable
ALTER TABLE `users` ADD COLUMN `passwordHash` VARCHAR(191) NULL,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `refreshTokenHash` VARCHAR(191) NULL;
